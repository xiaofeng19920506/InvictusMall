import { execSync } from "child_process";
import os from "os";
// Load environment variables from .env file
// Expo automatically loads .env files, but we can also use dotenv for explicit loading
if (process.env.NODE_ENV !== "production") {
  try {
    require("dotenv").config();
  } catch (e) {
    // dotenv is optional, expo loads .env automatically
  }
}

/**
 * Get the local network IP address automatically
 * This is used for physical device testing where the device needs to connect
 * to the development server running on your computer
 */
function getLocalNetworkIP() {
  try {
    // Priority 1: Use environment variable from .env file or system env
    // Expo automatically loads .env files, so this should work
    if (process.env.DEVICE_API_IP) {
      console.log(
        "📱 Using DEVICE_API_IP from .env file or environment:",
        process.env.DEVICE_API_IP
      );
      return process.env.DEVICE_API_IP;
    }

    // Priority 2: Try to get IP from network interfaces
    const interfaces = os.networkInterfaces();

    // Prefer Wi-Fi/Ethernet interfaces (en0 on Mac, eth0 on Linux, wlan0 on Linux)
    const priorityInterfaces = ["en0", "eth0", "wlan0"];

    for (const ifaceName of priorityInterfaces) {
      const iface = interfaces[ifaceName];
      if (iface) {
        for (const addr of iface) {
          // Prefer IPv4, internal address (not loopback)
          if (addr.family === "IPv4" && !addr.internal) {
            console.log(
              `📱 Detected local IP from interface ${ifaceName}:`,
              addr.address
            );
            return addr.address;
          }
        }
      }
    }

    // Priority 3: Find any non-internal IPv4 address
    for (const ifaceName of Object.keys(interfaces)) {
      const iface = interfaces[ifaceName];
      if (iface) {
        for (const addr of iface) {
          if (addr.family === "IPv4" && !addr.internal) {
            console.log(
              `📱 Detected local IP from interface ${ifaceName}:`,
              addr.address
            );
            return addr.address;
          }
        }
      }
    }

    // Priority 4: Try using ifconfig command (Unix/Mac)
    if (process.platform !== "win32") {
      try {
        const ip = execSync(
          "ifconfig | grep \"inet \" | grep -v 127.0.0.1 | head -1 | awk '{print $2}'"
        )
          .toString()
          .trim();
        if (ip) {
          console.log("📱 Detected local IP using ifconfig:", ip);
          return ip;
        }
      } catch (e) {
        // Ignore errors, fall through to default
      }
    }
  } catch (error) {
    console.warn("⚠️ Failed to detect local network IP:", error.message);
  }

  // Default fallback - use the IP from .env file if available
  // This will be used if auto-detection fails
  const envIP = process.env.DEVICE_API_IP;
  if (envIP) {
    console.log("📱 Using DEVICE_API_IP from .env file:", envIP);
    return envIP;
  }
  
  console.warn("⚠️ Using default fallback IP: 10.1.10.9");
  return "10.1.10.9";
}

// Get the device API IP (prioritize .env file, then auto-detection)
const deviceAPIIP = process.env.DEVICE_API_IP || getLocalNetworkIP();
const API_PORT = process.env.API_PORT || "3001";

// Build API URLs
// For physical devices: use the IP from .env or detected IP
const DEVICE_API_URL =
  process.env.DEVICE_API_URL || `http://${deviceAPIIP}:${API_PORT}`;
// For simulators: always use localhost
const SIMULATOR_API_URL =
  process.env.SIMULATOR_API_URL || "http://localhost:3001";
// Override all if set
const API_BASE_URL = process.env.API_BASE_URL;

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
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.invictusmall.logistics",
      infoPlist: {
        NSCameraUsageDescription:
          "We need access to your camera to scan barcodes for warehouse and shipping operations.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.invictusmall.logistics",
      permissions: ["CAMERA"],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow Invictus Logistics to access your camera for barcode scanning.",
        },
      ],
    ],
    extra: {
      // API configuration
      // - apiUrl: Used when API_BASE_URL env var is set (overrides everything)
      // - deviceApiUrl: Automatically detected network IP for physical devices
      // - simulatorApiUrl: localhost for iOS/Android simulators
      apiUrl: API_BASE_URL || SIMULATOR_API_URL,
      deviceApiUrl: DEVICE_API_URL,
      simulatorApiUrl: SIMULATOR_API_URL,
      // Debug info
      detectedLocalIP: deviceAPIIP,
    },
  },
};
