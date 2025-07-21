import SwiftUI

public struct SparkleBadge: View {
    let rank: String
    @State private var showSparkle = false

    private let rankColors: [String: Color] = [
        "Iron": Color(red: 96/255, green: 71/255, blue: 58/255),
        "Bronze": Color(red: 140/255, green: 90/255, blue: 65/255),
        "Silver": Color.gray,
        "Gold": Color.yellow,
        "Platinum": Color.cyan,
        "Emerald": Color.green,
        "Diamond": Color.blue,
        "Master": Color.purple,
        "Grandmaster": Color.red,
        "Challenger": Color.orange
    ]

    private var sparkleRanks: Set<String> = [
        "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"
    ]

    public init(rank: String) {
        self.rank = rank
    }

    public var body: some View {
        ZStack {
            Circle()
                .fill(rankColors[rank] ?? .gray)
                .frame(width: 30, height: 30)
                .onTapGesture {
                    // Manually trigger sparkle on tap
                    withAnimation(.easeInOut(duration: 1)) {
                        showSparkle = true
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        showSparkle = false
                    }
                }

            if sparkleRanks.contains(rank) && showSparkle {
                Image(systemName: "sparkles")
                    .foregroundColor(.white)
                    .scaleEffect(1.2)
                    .transition(.opacity)
                    .offset(x: 8, y: -8)
                    .zIndex(1)
            }
        }
        .onAppear {
            if sparkleRanks.contains(rank) {
                // Start sparkle on a timer every minute
                Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
                    withAnimation(.easeInOut(duration: 1)) {
                        showSparkle = true
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        showSparkle = false
                    }
                }
            }
        }
    }
}
