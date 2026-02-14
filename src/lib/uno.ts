
export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type CardValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wildDraw4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isHost: boolean;
  hasCalledUno: boolean;
  isEliminated?: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  discardPile: Card[];
  drawStack: number; // For +2, +4 stacking
  status: 'lobby' | 'playing' | 'gameover';
  winner: string | null;
  activeColor: CardColor | null; // For wild cards
}

export const createDeck = (playerCount: number): Card[] => {
  const numDecks = Math.ceil(playerCount / 5);
  const deck: Card[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  const values: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

  for (let d = 0; d < numDecks; d++) {
    colors.forEach(color => {
      values.forEach(value => {
        // One '0' card per color
        // Two of each other card per color
        const count = value === '0' ? 1 : 2;
        for (let i = 0; i < count; i++) {
          deck.push({ id: `${d}-${color}-${value}-${i}`, color, value });
        }
      });
    });

    for (let i = 0; i < 4; i++) {
      deck.push({ id: `${d}-wild-${i}`, color: 'wild', value: 'wild' });
      deck.push({ id: `${d}-wildDraw4-${i}`, color: 'wild', value: 'wildDraw4' });
    }
  }

  return shuffle(deck);
};

export const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const isValidMove = (card: Card, topCard: Card, activeColor: CardColor | null, drawStack: number): boolean => {
  // If there's a draw stack, you can only play a drawing card
  if (drawStack > 0) {
    if (card.value === 'draw2' || card.value === 'wildDraw4') {
      return true; // Aggressive stacking: any draw card on any draw stack
    }
    return false;
  }

  if (card.color === 'wild') return true;
  if (card.color === (activeColor || topCard.color)) return true;
  if (card.value === topCard.value) return true;

  return false;
};

export class GameEngine {
  state: GameState;
  drawPile: Card[];

  constructor(players: Player[]) {
    this.drawPile = createDeck(players.length);
    let initialDiscard = this.drawPile.pop()!;
    
    // Ensure initial discard isn't a wild draw 4
    while (initialDiscard.value === 'wildDraw4') {
        this.drawPile.unshift(initialDiscard);
        this.drawPile = shuffle(this.drawPile);
        initialDiscard = this.drawPile.pop()!;
    }

    this.state = {
      players: players.map(p => ({ ...p, hand: [], hasCalledUno: false, isEliminated: false })),
      currentPlayerIndex: 0,
      direction: 1,
      discardPile: [initialDiscard],
      drawStack: 0,
      status: 'playing',
      winner: null,
      activeColor: initialDiscard.color === 'wild' ? 'red' : initialDiscard.color,
    };

    // Deal cards
    this.state.players.forEach(player => {
      for (let i = 0; i < 7; i++) {
        player.hand.push(this.drawPile.pop()!);
      }
    });
  }

  callUno(playerId: string): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.hand.length > 2) return false;
    player.hasCalledUno = true;
    return true;
  }

  challengeUno(challengerId: string, targetId: string): boolean {
    const target = this.state.players.find(p => p.id === targetId);
    if (!target) return false;

    // If they have 1 card and haven't called Uno
    if (target.hand.length === 1 && !target.hasCalledUno) {
        for (let i = 0; i < 2; i++) {
            this.addCardToHand(target);
        }
        return true;
    }
    return false;
  }

  playCard(playerId: string, cardIds: string[], chosenColor?: CardColor): boolean {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.state.currentPlayerIndex) return false;

    const player = this.state.players[playerIndex];
    if (cardIds.length === 0) return false;

    // Validate the first card against the top of the pile
    const firstCard = player.hand.find(c => c.id === cardIds[0]);
    const topCard = this.state.discardPile[this.state.discardPile.length - 1];

    if (!firstCard || !isValidMove(firstCard, topCard, this.state.activeColor, this.state.drawStack)) return false;

    // Validate that all subsequent cards have the same value as the first
    const selectedCards: Card[] = [];
    for (const id of cardIds) {
        const card = player.hand.find(c => c.id === id);
        if (!card || card.value !== firstCard.value) return false;
        selectedCards.push(card);
    }

    // Process all cards
    selectedCards.forEach(card => {
        const idx = player.hand.findIndex(c => c.id === card.id);
        player.hand.splice(idx, 1);
        this.state.discardPile.push(card);

        // Accumulate effects
        if (card.value === 'draw2') {
            this.state.drawStack += 2;
        } else if (card.value === 'wildDraw4') {
            this.state.drawStack += 4;
        }
    });

    const lastCard = selectedCards[selectedCards.length - 1];
    if (lastCard.color === 'wild') {
      this.state.activeColor = chosenColor || 'red';
    } else {
      this.state.activeColor = lastCard.color;
    }

    if (player.hand.length > 1) {
        player.hasCalledUno = false;
    }

    if (player.hand.length === 0) {
      this.state.winner = player.id;
      this.state.status = 'gameover';
      return true;
    }

    // Advanced turn logic with multiple action cards
    if (this.state.drawStack === 0) {
        if (firstCard.value === 'skip') {
            if (this.state.players.length === 2) {
                // In 2-player, any number of skips means it's still my turn
                this.advanceTurn(0);
            } else {
                // In multi-player, skip N people
                this.advanceTurn(selectedCards.length + 1);
            }
        } else if (firstCard.value === 'reverse') {
            if (this.state.players.length === 2) {
                // In 2-player, Reverse acts like a Skip
                // One reverse = skip opponent. Two reverses = opponent gets a turn (they cancel)
                if (selectedCards.length % 2 !== 0) {
                    this.advanceTurn(0);
                } else {
                    this.advanceTurn(1);
                }
            } else {
                // Even number of reverses cancel out, odd number reverses direction
                if (selectedCards.length % 2 !== 0) {
                    this.state.direction *= -1;
                }
                this.advanceTurn(1);
            }
        } else {
            this.advanceTurn(1);
        }
    } else {
        this.advanceTurn(1);
        this.checkAndAutoResolveStack();
    }

    return true;
  }

  private checkAndAutoResolveStack() {
    if (this.state.drawStack === 0) return;

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const topCard = this.state.discardPile[this.state.discardPile.length - 1];
    
    const canStack = currentPlayer.hand.some(c => 
        isValidMove(c, topCard, this.state.activeColor, this.state.drawStack)
    );

    if (!canStack) {
        // Force draw and skip
        for (let i = 0; i < this.state.drawStack; i++) {
            this.addCardToHand(currentPlayer);
        }
        this.state.drawStack = 0;
        this.advanceTurn(1);
    }
  }

  drawCard(playerId: string): boolean {
    const player = this.state.players[this.state.currentPlayerIndex];
    if (player.id !== playerId) return false;

    if (this.state.drawStack > 0) {
      // Must draw the whole stack
      for (let i = 0; i < this.state.drawStack; i++) {
        this.addCardToHand(player);
      }
      this.state.drawStack = 0;
      if (!this.checkAndEliminate(player)) {
          this.advanceTurn(1);
      }
    } else {
      // Keep drawing until a playable card is found
      let foundPlayable = false;
      const topCard = this.state.discardPile[this.state.discardPile.length - 1];
      
      while (!foundPlayable && player.hand.length < 21) {
        this.addCardToHand(player);
        const lastDrawn = player.hand[player.hand.length - 1];
        
        if (isValidMove(lastDrawn, topCard, this.state.activeColor, 0)) {
            foundPlayable = true;
            break;
        }
      }

      // If we never found a playable card and hit the limit, eliminate the player
      if (!foundPlayable && player.hand.length >= 21) {
          this.checkAndEliminate(player);
      }
      // If foundPlayable is true, we do NOT advance the turn.
      // The player now has the playable card in their hand and must play it.
    }

    return true;
  }

  private checkAndEliminate(player: Player): boolean {
      if (player.hand.length >= 21) {
          player.isEliminated = true;
          player.hand = [];
          
          const activePlayers = this.state.players.filter(p => !p.isEliminated);
          
          if (activePlayers.length < 2) {
              this.state.status = 'gameover';
              this.state.winner = activePlayers[0]?.id || null;
              return true;
          }
          
          // If it's the current player, we must advance
          if (this.state.players[this.state.currentPlayerIndex].id === player.id) {
              this.advanceTurn(1);
          }
          return true;
      }
      return false;
  }

  private addCardToHand(player: Player) {
    if (this.drawPile.length === 0) {
      const topCard = this.state.discardPile.pop()!;
      this.drawPile = shuffle(this.state.discardPile);
      this.state.discardPile = [topCard];
    }
    player.hand.push(this.drawPile.pop()!);
  }

  private advanceTurn(steps: number) {
    const n = this.state.players.length;
    if (n === 0) return;

    let nextIndex = (this.state.currentPlayerIndex + (this.state.direction * steps) + (n * Math.abs(steps))) % n;
    
    // Skip eliminated players
    let attempts = 0;
    while (this.state.players[nextIndex].isEliminated && attempts < n) {
        nextIndex = (nextIndex + this.state.direction + n) % n;
        attempts++;
    }
    
    this.state.currentPlayerIndex = nextIndex;
  }
}
