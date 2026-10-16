import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';

/**
 * Universal image picker that works on Android APK, iOS, and Web.
 * Returns a data:image base64 URI or file URI that can be saved directly to MongoDB.
 */
export const pickImageFromDevice = async (options = {}) => {
    try {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant photo library access in device settings to choose an image.'
                );
                return null;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: options.allowsEditing !== undefined ? options.allowsEditing : true,
            aspect: options.aspect || [1, 1],
            quality: options.quality !== undefined ? options.quality : 0.6,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            if (asset.base64) {
                return `data:image/jpeg;base64,${asset.base64}`;
            }
            return asset.uri;
        }
        return null;
    } catch (err) {
        console.warn('Failed to pick image:', err);
        return null;
    }
};
