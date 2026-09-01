/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App.tsx';
import { name as appName } from './app.json';
import { registerNotificationHandler } from '../src/sdk';

// Must be called before AppRegistry — handles notification taps in background/killed state
registerNotificationHandler();

AppRegistry.registerComponent(appName, () => App);
