import Foundation

struct VerseTeaser: Codable {
    let scriptureReference: String
    let excerpt: String
    let isFallback: Bool

    enum CodingKeys: String, CodingKey {
        case scriptureReference = "scripture_reference"
        case excerpt
        case isFallback = "is_fallback"
    }
}

// Mesmos ~5 versiculos embutidos em src/widgets/fallbackVerses.ts (Android) e
// data/fallback_verses.py (backend) — ultimo recurso, sem rede, pra quando
// nao ha nada em cache e o fetch falha. Duplicado por nao haver import entre
// Swift/TS/Python; manter os tres sincronizados se expandir.
let localFallbackVerses: [VerseTeaser] = [
    VerseTeaser(scriptureReference: "João 3:16", excerpt: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigénito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", isFallback: true),
    VerseTeaser(scriptureReference: "Salmos 23:1", excerpt: "O Senhor é o meu pastor; nada me faltará.", isFallback: true),
    VerseTeaser(scriptureReference: "Filipenses 4:13", excerpt: "Posso todas as coisas em Cristo que me fortalece.", isFallback: true),
    VerseTeaser(scriptureReference: "Provérbios 3:5-6", excerpt: "Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento.", isFallback: true),
    VerseTeaser(scriptureReference: "Isaías 41:10", excerpt: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.", isFallback: true),
]

func localFallback(for date: Date) -> VerseTeaser {
    let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: date) ?? 1
    return localFallbackVerses[dayOfYear % localFallbackVerses.count]
}
