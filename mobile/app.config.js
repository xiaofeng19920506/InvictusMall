export default {
  expo: {
    name: "Invictus Logistics",
    slug: "invictus-logistics",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.invictusmall.logistics",
      infoPlist: {
        NSCameraUsageDescription: "We need access to your camera to scan barcodes for warehouse and shipping operations."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.invictusmall.logistics",
      permissions: [
        "CAMERA"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Allow Invictus Logistics to access your camera for barcode scanning."
        }
      ]
    ],
    extra: {
      // Use environment variable if set, otherwise use local network IP for mobile testing
      // For simulator/emulator, use localhost. For real device, use your computer's IP
      apiUrl: process.env.API_BASE_URL || "http://192.168.68.59:3001"
    }
  }
};

