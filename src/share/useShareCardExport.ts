import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import type { ViewShotRef } from 'react-native-view-shot';

/**
 * `MediaLibrary.saveToLibraryAsync` está obsoleto no SDK 57 (só funciona via
 * `expo-media-library/legacy`) — a API atual é `Asset.create(uri)`, por isso
 * esse caminho em vez do que a maioria dos exemplos antigos mostra.
 */
export function useShareCardExport() {
  const ref = useRef<ViewShotRef>(null);
  const [processando, setProcessando] = useState<'compartilhar' | 'salvar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function capturar(): Promise<string | null> {
    if (!ref.current) return null;
    return ref.current.capture();
  }

  async function compartilhar() {
    setErro(null);
    setProcessando('compartilhar');
    try {
      const uri = await capturar();
      if (!uri) {
        setErro('Não foi possível gerar a imagem.');
        return;
      }
      const disponivel = await Sharing.isAvailableAsync();
      if (!disponivel) {
        setErro('Compartilhamento não está disponível neste aparelho.');
        return;
      }
      await Sharing.shareAsync(uri, {
        dialogTitle: 'Compartilhar reflexão',
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch {
      setErro('Não foi possível compartilhar a imagem.');
    } finally {
      setProcessando(null);
    }
  }

  async function salvar() {
    setErro(null);
    setSalvo(false);
    setProcessando('salvar');
    try {
      const uri = await capturar();
      if (!uri) {
        setErro('Não foi possível gerar a imagem.');
        return;
      }
      const permissao = await MediaLibrary.requestPermissionsAsync(true);
      if (!permissao.granted) {
        setErro('Permita o acesso às fotos para salvar o cartão.');
        return;
      }
      await MediaLibrary.Asset.create(uri);
      setSalvo(true);
    } catch {
      setErro('Não foi possível salvar a imagem.');
    } finally {
      setProcessando(null);
    }
  }

  return { ref, processando, erro, salvo, compartilhar, salvar };
}
