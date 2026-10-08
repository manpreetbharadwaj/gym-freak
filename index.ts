import { registerRootComponent } from 'expo';
import App from './App';
// Registers the background location task before React mounts (the OS may deliver fixes at any time during an activity).
import './src/features/activity/tracker';

registerRootComponent(App);
