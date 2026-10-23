import SwiftUI
import WidgetKit

private let appGroup = "group.com.feith.app"
private let cacheKey = "verseWidgetTeaser"
// Hardcoded de proposito: a extensao nao le EXPO_PUBLIC_API_URL (so existe no
// bundle JS do app principal), e um widget so importa em build de
// TestFlight/App Store — onde a API e sempre a de producao.
private let dailyPublicURL = URL(string: "https://feith.space/api/reflections/daily/public")

private func cachedTeaser() -> VerseTeaser? {
    guard let data = UserDefaults(suiteName: appGroup)?.data(forKey: cacheKey) else { return nil }
    return try? JSONDecoder().decode(VerseTeaser.self, from: data)
}

private func cache(_ teaser: VerseTeaser) {
    guard let data = try? JSONEncoder().encode(teaser) else { return }
    UserDefaults(suiteName: appGroup)?.set(data, forKey: cacheKey)
}

private func fetchTeaser() async -> VerseTeaser {
    guard let url = dailyPublicURL else {
        return cachedTeaser() ?? localFallback(for: Date())
    }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        let teaser = try JSONDecoder().decode(VerseTeaser.self, from: data)
        cache(teaser)
        return teaser
    } catch {
        return cachedTeaser() ?? localFallback(for: Date())
    }
}

struct VerseEntry: TimelineEntry {
    let date: Date
    let teaser: VerseTeaser
}

struct VerseProvider: TimelineProvider {
    func placeholder(in context: Context) -> VerseEntry {
        VerseEntry(date: Date(), teaser: cachedTeaser() ?? localFallback(for: Date()))
    }

    func getSnapshot(in context: Context, completion: @escaping (VerseEntry) -> Void) {
        completion(VerseEntry(date: Date(), teaser: cachedTeaser() ?? localFallback(for: Date())))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VerseEntry>) -> Void) {
        Task {
            let teaser = await fetchTeaser()
            let entry = VerseEntry(date: Date(), teaser: teaser)
            let nextMidnight = Calendar.current.nextDate(
                after: Date(),
                matching: DateComponents(hour: 0, minute: 0),
                matchingPolicy: .nextTime
            ) ?? Date().addingTimeInterval(6 * 60 * 60)
            completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
        }
    }
}

private let oxblood = Color(red: 0.478, green: 0.122, blue: 0.122)
private let inkSoft = Color(red: 0.165, green: 0.165, blue: 0.165)
private let goldLight = Color(red: 0.722, green: 0.612, blue: 0.361)
private let cream = Color(red: 0.980, green: 0.973, blue: 0.957)

struct VerseWidgetView: View {
    var entry: VerseEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(entry.teaser.scriptureReference)
                // `.serif` e o design embutido do sistema (New York no iOS) —
                // mesmo espirito editorial do Cormorant Garamond do app, sem
                // empacotar fonte customizada na extensao do widget.
                .font(.system(.subheadline, design: .serif))
                .fontWeight(.semibold)
                .foregroundColor(oxblood)

            // Fio de ouro curto que desvanece pra direita — mesma funcao do
            // GoldRule do app, nao uma linha solida de ponta a ponta.
            LinearGradient(colors: [goldLight, goldLight.opacity(0)], startPoint: .leading, endPoint: .trailing)
                .frame(width: 32, height: 2)
                .padding(.top, 7)
                .padding(.bottom, 9)

            Text(entry.teaser.excerpt)
                .font(.system(.footnote, design: .serif))
                .foregroundColor(inkSoft)
                .lineLimit(4)

            Spacer(minLength: 8)

            Text("feith")
                .font(.system(.caption2, design: .serif))
                .italic()
                .fontWeight(.semibold)
                .foregroundColor(goldLight)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "feith://hoje"))
        .containerBackground(cream, for: .widget)
    }
}

struct VerseWidget: Widget {
    let kind: String = "VerseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: VerseProvider()) { entry in
            VerseWidgetView(entry: entry)
        }
        .configurationDisplayName("Versículo do dia")
        .description("Um trecho da leitura de hoje, direto na tela inicial.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
