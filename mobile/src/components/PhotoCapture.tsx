import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";

interface PhotoCaptureProps {
  onPhotoTaken: (imageUri: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoTaken,
  onClose,
  title = "Take Photo",
  description = "Take a photo of the product",
}) => {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera permission is required to take photos. Please enable it in your device settings."
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to take photo");
    }
  };

  const handleSelectFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to select image");
    }
  };

  const handleConfirm = () => {
    if (imageUri) {
      onPhotoTaken(imageUri);
    }
  };

  const handleRetake = () => {
    setImageUri(null);
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <SafeAreaView style={styles.safeAreaTop} edges={["top"]}>
          <View
            style={[
              styles.header,
              {
                paddingTop: Math.max(
                  insets.top || 0,
                  Platform.OS === "ios" ? 12 : 16
                ),
              },
            ]}
          >
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.content}>
          {!imageUri ? (
            <>
              <Text style={styles.description}>{description}</Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cameraButton]}
                  onPress={handleTakePhoto}
                  disabled={isProcessing}
                >
                  <MaterialIcons name="camera-alt" size={32} color="#fff" />
                  <Text style={styles.buttonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.libraryButton]}
                  onPress={handleSelectFromLibrary}
                  disabled={isProcessing}
                >
                  <MaterialIcons name="photo-library" size={32} color="#fff" />
                  <Text style={styles.buttonText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.button, styles.retakeButton]}
                  onPress={handleRetake}
                >
                  <MaterialIcons name="refresh" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={handleConfirm}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={24} color="#fff" />
                      <Text style={styles.buttonText}>Confirm</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        <SafeAreaView edges={["bottom"]} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeAreaTop: {
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  description: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  cameraButton: {
    backgroundColor: "#007AFF",
  },
  libraryButton: {
    backgroundColor: "#34C759",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  preview: {
    width: "100%",
    height: 400,
    borderRadius: 12,
    marginBottom: 20,
    resizeMode: "contain",
    backgroundColor: "#f5f5f5",
  },
  previewActions: {
    flexDirection: "row",
    gap: 16,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: "#8E8E93",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#007AFF",
  },
});

export default PhotoCapture;
