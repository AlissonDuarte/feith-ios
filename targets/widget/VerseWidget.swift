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

struct VerseWidgetView: View {
    var entry: VerseEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(entry.teaser.scriptureReference)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(Color(red: 0.478, green: 0.122, blue: 0.122))
            Text(entry.teaser.excerpt)
                .font(.caption)
                .foregroundColor(Color(red: 0.102, green: 0.102, blue: 0.102))
                .lineLimit(4)
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "feith://hoje"))
        .containerBackground(Color(red: 0.980, green: 0.973, blue: 0.957), for: .widget)
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
