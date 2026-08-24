import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { getColors } from "react-native-image-colors";
import { relativeLuminance } from "@/theme/adaptivePalette";

const imagesDirectory = new Directory(Paths.document, "between-us-images");

function extensionForMime(mimeType?: string | null) {
  return mimeType === "image/png" ? "png" : "jpg";
}

export async function selectAndStoreImage(prefix: string) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("PHOTO_PERMISSION_DENIED");
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 1 });
  return storePickerImage(prefix, result);
}

export async function captureAndStoreImage(prefix: string) {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error("CAMERA_PERMISSION_DENIED");
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], cameraType: ImagePicker.CameraType.back, quality: 1 });
  return storePickerImage(prefix, result);
}

async function storePickerImage(prefix: string, result: ImagePicker.ImagePickerResult) {
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if ((asset.width ?? 0) > 1800) context.resize({ width: 1800 });
  const rendered = await context.renderAsync();
  const compressed = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });

  imagesDirectory.create({ idempotent: true, intermediates: true });
  const filename = `${prefix}-${Date.now()}.${extensionForMime("image/jpeg")}`;
  const destination = new File(imagesDirectory, filename);
  await new File(compressed.uri).copy(destination, { overwrite: true });
  return destination.uri;
}

export async function analyzeImageLuminance(uri: string) {
  const result = await getColors(uri, { fallback: "#F7FAFC", cache: true, key: uri, quality: "lowest", pixelSpacing: 8 });
  const representative = result.platform === "ios" ? result.background : result.platform === "android" ? result.average : result.dominant;
  return { representativeColor: representative, luminance: relativeLuminance(representative) };
}

export function deleteStoredImage(uri?: string | null) {
  if (!uri || !uri.startsWith(imagesDirectory.uri)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
