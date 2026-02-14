
import { create } from 'zustand';
import type { GameState, Card, CardColor, Player } from '@/lib/uno';
import { GameEngine } from '@/lib/uno';
import type { Peer, DataConnection } from 'peerjs';

interface GameStore {
  peer: Peer | null;
  hostConnection: DataConnection | null;
  connections: Record<string, DataConnection>;
  gameState: GameState | null;
  myId: string;
  myName: string;
  isHost: boolean;
  roomCode: string;
  lastAction: { playerId: string; type: 'play' | 'draw'; card?: Card; id: number } | null;
  
  // Actions
  initPeer: (name: string) => Promise<string>;
  hostRoom: () => void;
  joinRoom: (code: string) => void;
  startGame: () => void;
  playAgain: () => void;
  playCard: (cardIds: string[], color?: CardColor) => void;
  drawCard: () => void;
  callUno: () => void;
  challengeUno: (targetId: string) => void;
  setMyName: (name: string) => void;
  broadcastState: () => void;
  resetGame: () => void;
}

let engine: GameEngine | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  peer: null,
  hostConnection: null,
  connections: {},
  gameState: null,
  myId: '',
  myName: '',
  isHost: false,
  roomCode: '',
  lastAction: null,

  resetGame: () => {
    const { peer, connections, hostConnection } = get();
    if (peer) peer.destroy();
    if (hostConnection) hostConnection.close();
    Object.values(connections).forEach(c => c.close());
    
    set({
      peer: null,
      hostConnection: null,
      connections: {},
      gameState: null,
      myId: '',
      isHost: false,
      roomCode: '',
      lastAction: null
    });
    engine = null;
  },

  setMyName: (name) => set({ myName: name }),

  broadcastState: () => {
    const { connections, gameState, lastAction } = get();
    if (!gameState) return;
    Object.values(connections).forEach(c => {
      c.send({ 
        type: 'STATE_UPDATE', 
        payload: {
          ...gameState,
          currentPlayerIndex: gameState.currentPlayerIndex // Explicitly ensure this is synced
        }, 
        action: lastAction 
      });
    });
  },

  initPeer: async (name) => {
    const { Peer } = await import('peerjs');
    const peer = new Peer();
    
    return new Promise((resolve) => {
      peer.on('open', (id) => {
        set({ peer, myId: id, myName: name });
        resolve(id);
      });

      peer.on('connection', (conn) => {
        const { isHost } = get();
        if (!isHost) return;

        conn.on('open', () => {
            // New player joined
        });

        conn.on('close', () => {
            const { isHost, gameState } = get();
            if (!isHost || !gameState) return;
            
            // Remove player
            const updatedPlayers = gameState.players.filter(p => p.id !== conn.peer);
            
            // If they were the current player, advance turn
            let newIdx = gameState.currentPlayerIndex;
            if (gameState.players[newIdx]?.id === conn.peer) {
                if (engine) {
                    // We need a way to skip a disconnected player in the engine
                    // For now, let's just use the existing advance logic if it's their turn
                    newIdx = newIdx % Math.max(1, updatedPlayers.length);
                }
            }

            set((state) => ({
                connections: Object.fromEntries(
                    Object.entries(state.connections).filter(([id]) => id !== conn.peer)
                ),
                gameState: {
                    ...gameState,
                    players: updatedPlayers,
                    currentPlayerIndex: newIdx
                }
            }));

            // If game was playing, we might need to recreate engine or just broadcast
            if (engine) {
                // Re-sync engine players if possible, or just force turn advance
                if (updatedPlayers.length < 2) {
                    set({ gameState: { ...get().gameState!, status: 'lobby' } });
                }
            }
            
            get().broadcastState();
        });

        conn.on('data', (data: any) => {
          const { type, payload } = data;
          
          if (type === 'JOIN') {
            const { gameState } = get();
            
            // Check if player ID already exists to prevent duplicates
            if (gameState?.players.some(p => p.id === conn.peer)) {
                console.log('Player already joined, ignoring duplicate JOIN request');
                return;
            }

            const newPlayer: Player = {
              id: conn.peer,
              name: payload.name,
              hand: [],
              isHost: false,
              hasCalledUno: false,
            };
            
            set((state) => ({
              connections: { ...state.connections, [conn.peer]: conn },
              gameState: state.gameState ? {
                ...state.gameState,
                players: [...state.gameState.players, newPlayer]
              } : {
                players: [{ id: state.myId, name: state.myName, hand: [], isHost: true, hasCalledUno: false }, newPlayer],
                currentPlayerIndex: 0,
                direction: 1,
                discardPile: [],
                drawStack: 0,
                status: 'lobby',
                winner: null,
                activeColor: null,
              }
            }));
            
            get().broadcastState();
          }

          if (type === 'MOVE') {
            if (engine) {
                const success = engine.playCard(conn.peer, payload.cardIds, payload.color);
                if (success) {
                    const card = engine.state.discardPile[engine.state.discardPile.length - 1];
                    set({ 
                        gameState: { ...engine.state },
                        lastAction: { playerId: conn.peer, type: 'play', card, id: Date.now() }
                    });
                    get().broadcastState();
                }
            }
          }

          if (type === 'DRAW') {
            if (engine) {
                engine.drawCard(conn.peer);
                set({ 
                    gameState: { ...engine.state },
                    lastAction: { playerId: conn.peer, type: 'draw', id: Date.now() }
                });
                get().broadcastState();
            }
          }

          if (type === 'UNO') {
            if (engine) {
                engine.callUno(conn.peer);
                set({ gameState: { ...engine.state } });
                get().broadcastState();
            }
          }

          if (type === 'CHALLENGE') {
            if (engine) {
                engine.challengeUno(conn.peer, payload.targetId);
                set({ gameState: { ...engine.state } });
                get().broadcastState();
            }
          }
        });
      });
    });
  },

  hostRoom: () => {
    const { myId, myName } = get();
    set({ 
      isHost: true, 
      roomCode: myId,
      lastAction: null,
      gameState: {
        players: [{ id: myId, name: myName, hand: [], isHost: true, hasCalledUno: false }],
        currentPlayerIndex: 0,
        direction: 1,
        discardPile: [],
        drawStack: 0,
        status: 'lobby',
        winner: null,
        activeColor: null,
      }
    });
  },

  joinRoom: (code) => {
    const { peer, myName } = get();
    if (!peer) return;

    const conn = peer.connect(code);
    set({ hostConnection: conn, roomCode: code, isHost: false });

    conn.on('open', () => {
      conn.send({ type: 'JOIN', payload: { name: myName } });
    });

    conn.on('data', (data: any) => {
      const { type, payload, action } = data;
      if (type === 'STATE_UPDATE') {
        set({ gameState: payload, lastAction: action });
      }
    });
  },

  startGame: () => {
    const { isHost, gameState } = get();
    if (!isHost || !gameState) return;

    engine = new GameEngine(gameState.players);
    set({ gameState: engine.state });
    get().broadcastState();
  },

  playAgain: () => {
    const { isHost, gameState } = get();
    if (!isHost || !gameState) return;

    // Create fresh state with same players but reset hands/pile
    engine = new GameEngine(gameState.players.map(p => ({ ...p, hand: [], hasCalledUno: false, isEliminated: false })));
    set({ gameState: engine.state });
    get().broadcastState();
  },

  playCard: (cardIds, color) => {
    const { isHost, hostConnection, myId } = get();
    if (isHost) {
      if (engine) {
        const success = engine.playCard(myId, cardIds, color);
        if (success) {
            const card = engine.state.discardPile[engine.state.discardPile.length - 1];
            set({ 
                gameState: { ...engine.state },
                lastAction: { playerId: myId, type: 'play', card, id: Date.now() }
            });
            get().broadcastState();
        }
      }
    } else if (hostConnection) {
      hostConnection.send({ type: 'MOVE', payload: { cardIds, color } });
    }
  },

  drawCard: () => {
    const { isHost, hostConnection, myId } = get();
    if (isHost) {
      if (engine) {
        engine.drawCard(myId);
        set({ 
            gameState: { ...engine.state },
            lastAction: { playerId: myId, type: 'draw', id: Date.now() }
        });
        get().broadcastState();
      }
    } else if (hostConnection) {
      hostConnection.send({ type: 'DRAW' });
    }
  },

  callUno: () => {
    const { isHost, hostConnection, myId } = get();
    if (isHost) {
      if (engine) {
        engine.callUno(myId);
        set({ gameState: { ...engine.state } });
        get().broadcastState();
      }
    } else if (hostConnection) {
      hostConnection.send({ type: 'UNO' });
    }
  },

  challengeUno: (targetId) => {
    const { isHost, hostConnection, myId } = get();
    if (isHost) {
      if (engine) {
        engine.challengeUno(myId, targetId);
        set({ gameState: { ...engine.state } });
        get().broadcastState();
      }
    } else if (hostConnection) {
      hostConnection.send({ type: 'CHALLENGE', payload: { targetId } });
    }
  },
}));
