import SwiftUI

struct TaskCard: View {
    @Binding var task: ScheduledTask
    var onDelete: () -> Void

    @State private var isExpanded = false
    @State private var editedTitle: String = ""
    @State private var editedDate: Date = Date()
    @State private var editedDescription: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Compact View
            HStack {
                Button(action: {
                    task.isCompleted.toggle()
                }) {
                    Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                        .foregroundColor(task.isCompleted ? .green : .gray)
                }

                Text(task.title)
                    .font(.headline)
                    .strikethrough(task.isCompleted, color: .gray)

                Spacer()

                Button(action: {
                    withAnimation { isExpanded.toggle() }
                }) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.blue)
                        .padding(4)
                }
            }

            // Expanded View
            if isExpanded {
                TextField("Task", text: $editedTitle)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .onChange(of: editedTitle) { task.title = editedTitle }
                
                TextField("Description", text: $editedDescription)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .onChange(of: editedDescription) { task.description = editedDescription }

                HStack (alignment: .center, spacing: 10) {
                    Text("Date:")
                    DatePicker("", selection: $editedDate, displayedComponents: .date)
                        .labelsHidden()
                        .datePickerStyle(.compact)
                    Button("Delete", role: .destructive) {
                        onDelete()
                    }
                }
                .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .padding(6)
        .background(task.isCompleted ? Color.green.opacity(0.15) : Color.gray.opacity(0.15))
        .cornerRadius(8)
        .onAppear {
            editedTitle = task.title
            editedDate = task.date
            editedDescription = task.description
        }
    }
}
