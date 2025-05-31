# Airsoft Tactical Map

A real-time tactical mapping application for airsoft games, built with React Native.

## Features

- Real-time player position tracking
- Team management system
- Tactical pin placement (enemies, objectives, hazards)
- Quick messaging system
- Compass and heading indicators
- Interactive map interface

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- React Native development environment setup
  - For iOS: XCode (Mac only)
  - For Android: Android Studio

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/airsoft-tactical-map.git
cd airsoft-tactical-map
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Install iOS dependencies (Mac only):
```bash
cd ios
pod install
cd ..
```

## Running the App

### iOS
```bash
npm run ios
# or
yarn ios
```

### Android
```bash
npm run android
# or
yarn android
```

## Project Structure

- `/AirsoftTacticalMap` - Main application code
  - `App.js` - Main application component
  - Other components and utilities (to be added)

## Dependencies

- react-native
- react-native-maps
- lucide-react-native
- react-native-svg

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Lucide Icons for the icon set
- React Native Maps for the mapping functionality 