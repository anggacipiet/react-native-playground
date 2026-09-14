// `expo-router/entry` is a side-effect-only script (registers the app's root
// component) with no exports and no shipped type declarations. Declaring it
// here tells TypeScript the module exists so `require('expo-router/entry')`
// doesn't trigger a "Cannot find module" error.
declare module 'expo-router/entry';
