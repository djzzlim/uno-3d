# UNO! 3D — Old School Style

A modern, fast-paced, and visually stunning 3D UNO! game built with Next.js and PeerJS. This is a **Vibe Coded** project—designed for the ultimate "old school" feel with a sleek 3D twist. Experience the classic card game with aggressive stacking rules, elimination mechanics, and real-time P2P multi-player action.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![PeerJS](https://img.shields.io/badge/PeerJS-333333?style=for-the-badge&logo=p2p&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

## 🚀 Features

- **3D Interactive Table:** Immersive game board with dynamic lighting and 3D animations.
- **Real-time Multi-player:** P2P connectivity via PeerJS—no central server required.
- **Aggressive Rules:**
  - **Stacking:** Stack +2 and +4 cards to punish your opponents.
  - **Auto-Draw:** Keep drawing until you find a playable card.
  - **Elimination:** Players with more than 21 cards are "BOOMED" out of the game.
- **Responsive Design:** Fully optimized for Mobile, Tablet, and Desktop.
- **Sound Effects:** Immersive audio for card throws, draws, and turn notifications.

## 🛠️ Tech Stack

- **Frontend:** Next.js 15+ (App Router), TypeScript
- **Styling:** Tailwind CSS 4, Framer Motion (Animations)
- **State Management:** Zustand
- **Networking:** PeerJS (WebRTC)
- **Visuals:** Canvas-Confetti, Lucide Icons

## 🎮 How to Play

1. **Host a Room:** Enter your nickname and click "Create Room". Share the generated Link or Room ID with your friends.
2. **Join a Room:** Paste the Room ID or click the invite link provided by the host.
3. **Gameplay:** 
   - Play cards matching the color or value of the top card.
   - Use Wild cards to change the active color.
   - If you have one card left, don't forget to press the **UNO!** button before someone challenges you!
   - Be careful—if you reach 21 cards, you're eliminated!

## 📦 Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/uno-3d.git
   cd uno-3d
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📄 License

MIT
