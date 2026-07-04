import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { theme } from '@/theme/theme';
import { Text } from './Text';

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  bucket?: string;
  pathPrefix?: string;
};

export function ImageUploadPicker({
  label = 'Imagem/GIF',
  value,
  onChange,
  bucket = 'body-media',
  pathPrefix = 'goals',
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function pickAndUpload() {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão para acessar imagens negada.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.88,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Não autenticado');
      if (!asset.base64) throw new Error('Não foi possível ler a imagem.');

      const contentType = asset.mimeType ?? 'image/jpeg';
      const extension = extensionFromAsset(asset.uri, contentType);
      const path = `${userId}/${pathPrefix}/${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
      const arrayBuffer = base64ToArrayBuffer(asset.base64);
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
        contentType,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.field}>
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable style={styles.picker} onPress={pickAndUpload} disabled={uploading} accessibilityRole="button">
        {value ? (
          <ExpoImage source={{ uri: value }} style={styles.preview} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <ImageIcon color={theme.colors.textMuted} size={22} />
          </View>
        )}
        <View style={styles.copy}>
          <Text variant="bodyMedium">{uploading ? 'Enviando...' : value ? 'Trocar imagem' : 'Escolher imagem'}</Text>
        </View>
        <Upload color={theme.colors.textMuted} size={18} />
      </Pressable>
      {value ? (
        <Pressable style={styles.clearBtn} onPress={() => onChange('')} accessibilityRole="button">
          <Trash2 color={theme.colors.hp} size={16} />
          <Text variant="label" color={theme.colors.hp}>Remover imagem</Text>
        </Pressable>
      ) : null}
      {error ? <Text variant="bodyMuted" color={theme.colors.hp}>{error}</Text> : null}
    </View>
  );
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function extensionFromAsset(uri: string, mimeType: string) {
  const fromUri = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5) return fromUri;
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'jpg';
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.xs },
  picker: {
    minHeight: 72,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  preview: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  placeholder: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  clearBtn: {
    minHeight: 34,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
});
