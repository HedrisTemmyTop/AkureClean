import React from "react";
import { View, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, X } from "lucide-react-native";

import { AppText } from "./AppText";
import { theme } from "../theme";

interface ImagePickerFieldProps {
  /** base64 data URI of the selected image (or null) */
  value: string | null;
  onChange: (dataUri: string | null) => void;
  label?: string;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  quality: 0.4,
  base64: true,
};

/**
 * Optional photo field. Opens the camera or gallery, compresses (quality 0.4)
 * and returns a base64 data URI which the server uploads to Cloudinary.
 */
export const ImagePickerField: React.FC<ImagePickerFieldProps> = ({
  value,
  onChange,
  label = "Tap to add a photo (Optional)",
}) => {
  const handleResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    onChange(`data:image/jpeg;base64,${asset.base64}`);
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow camera access to take a photo.");
      return;
    }
    handleResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  };

  const fromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }
    handleResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  };

  const choose = () =>
    Alert.alert("Add photo", "Choose a source", [
      { text: "Camera", onPress: fromCamera },
      { text: "Gallery", onPress: fromGallery },
      { text: "Cancel", style: "cancel" },
    ]);

  if (value) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
        <TouchableOpacity style={styles.remove} onPress={() => onChange(null)}>
          <X color="#fff" size={16} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.placeholder} onPress={choose} activeOpacity={0.7}>
      <Camera color={theme.colors.textSecondary} size={32} />
      <AppText
        variant="bodySmall"
        color={theme.colors.textSecondary}
        style={{ marginTop: theme.spacing.sm }}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    height: 120,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  previewWrap: {
    marginBottom: theme.spacing.lg,
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: theme.borderRadius.md,
  },
  remove: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    padding: 6,
  },
});
