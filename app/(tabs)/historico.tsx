import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, scheme } from '../../src/components/ui';

/**
 * Placeholder da M2. A tela real e um FeedList virtualizado com scroll
 * infinito e busca — os tres feeds da web (BookmarkedFeed, NotesFeed,
 * HistoryFeed) sao quase identicos e viram um componente so.
 */
export default function Historico() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <EmptyState titulo="Histórico" descricao="Em construção." />
    </SafeAreaView>
  );
}
