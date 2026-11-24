# Fish Bite Forecast phone app (Expo)

The iPhone and Android app for Fish Bite Forecast. It shows fishforecast.net and adds:

- the phone camera for catch photos
- the phone's GPS for the local forecast, tides and catch log
- haptics, an offline screen, and opening outside links in the phone's browser

Changes to the website show up in the app right away, with no new app release.

Build in the cloud with EAS (no Mac needed). Profiles in `eas.json`:
- `preview`: Android APK to install directly, or an iPhone build for registered test devices
- `simulator`: iPhone simulator build
- `production`: App Store and Google Play builds
