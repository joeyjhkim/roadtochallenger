import SwiftUI

struct TaskSchedulerView: View {
    @State private var selectedDate = Date()

    var body: some View {
        NavigationView {
            HStack {
                Spacer()
                VStack {
                    DatePicker(
                        "Select a Day",
                        selection: $selectedDate,
                        displayedComponents: [.date]
                    )
                    .datePickerStyle(GraphicalDatePickerStyle())
                    .padding()

                    Spacer()
                    Text("Tasks for \(selectedDate, formatter: dateFormatter)")
                        .font(.headline)
                    Spacer()
                }
                .frame(maxWidth: 500)
                Spacer()
            }
            .navigationTitle("Daily Tasks")
        }
    }

    private var dateFormatter: DateFormatter {
        let df = DateFormatter()
        df.dateStyle = .full
        return df
    }
}
