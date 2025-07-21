import SwiftUI

struct ScheduledTask: Identifiable, Codable {
    var id = UUID()
    var title: String
    var description: String = ""
    var date: Date
    var isCompleted: Bool = false
    var rolloverCount: Int = 0
}

struct TaskSchedulerView: View {
    @State private var newTaskDate = Date() //for left panel calendar
    @State private var selectedViewDate = Date() //for right panel calendar
    @State private var newTaskTitle = ""
    @State private var tasks: [ScheduledTask] = []
    @State private var newTaskDescription = ""
    
    var body: some View {
        HStack(spacing: 0) {
            let panelBackground = Color(red: 194/255, green: 186/255, blue: 174/255)
            // LEFT HALF
            VStack {
                VStack(alignment: .center, spacing: 10) {
                    Text("Add New Task")
                        .font(.title2).bold()
                    
                    // Graphical calendar
                    DatePicker("", selection: $newTaskDate, displayedComponents: .date)
                        .datePickerStyle(GraphicalDatePickerStyle())
                        .labelsHidden()
                    
                    TextField("Enter task", text: $newTaskTitle)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    TextField("Task Description", text: $newTaskDescription).textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    Button("Add Task") {
                        let newTask = ScheduledTask(title: newTaskTitle, description: newTaskDescription, date: newTaskDate)
                        tasks.append(newTask)
                        newTaskTitle = ""
                        newTaskDescription = ""
                    }
                    .disabled(newTaskTitle.isEmpty)
                }
                .padding(.top, 15)
                .padding()
                .background(panelBackground)
                .cornerRadius(8)
                
                Spacer()
            }
            
            Divider()
            
            // RIGHT HALF
            VStack {
                VStack(alignment: .center, spacing: 10) {
                    Text(selectedViewDate, formatter: dateFormatter)
                        .font(.title2).bold()
                    Spacer()
                    
                    DatePicker("", selection: $selectedViewDate, displayedComponents: .date)
                        .datePickerStyle(GraphicalDatePickerStyle())
                        .labelsHidden()
                        .scaleEffect(1.2)
                    
                    ScrollView {
                        VStack(alignment: .leading, spacing: 10) {
                            ForEach(Array(tasks.enumerated()), id: \.element.id) { index, task in
                                if Calendar.current.isDate(task.date, inSameDayAs: selectedViewDate) {
                                    TaskCard(task: $tasks[index]) {
                                        tasks.remove(at: index)
                                    }
                                }
                            }

                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(height: 150)
                }
                .padding(.top, 15)
                .padding()
                
                Spacer()
            }
            .frame(maxWidth: .infinity)
            .background(Color(red: 194/255, green: 186/255, blue: 174/255))
        }
        
        .onAppear {
            loadTasks()
            maintainTasks()
        }

        
    }

    var tasksForSelectedDate: [ScheduledTask] {
        tasks.filter {
            Calendar.current.isDate($0.date, inSameDayAs: selectedViewDate)
        }
    }

    private var dateFormatter: DateFormatter {
        let df = DateFormatter()
        df.dateStyle = .full
        return df
    }
    
    private func maintainTasks() {
        let today = Calendar.current.startOfDay(for: Date())
        var updatedTasks: [ScheduledTask] = []

        for var task in tasks {
            let taskDate = Calendar.current.startOfDay(for: task.date)

            if task.isCompleted {
                // Auto-delete if it's been completed > 2 days ago
                if let daysSinceCompletion = Calendar.current.dateComponents([.day], from: taskDate, to: today).day,
                   daysSinceCompletion >= 2 {
                    continue // skip (delete)
                }
            } else {
                // Rollover if the task date is in the past
                if taskDate < today {
                    task.date = Calendar.current.date(byAdding: .day, value: 1, to: task.date) ?? task.date
                    task.rolloverCount += 1
                }

                // If task has rolled multiple times and enters a new month → push to next month
                if task.rolloverCount >= 3 {
                    let currentMonth = Calendar.current.component(.month, from: task.date)
                    let newMonth = (currentMonth % 12) + 1
                    if let newDate = Calendar.current.date(bySetting: .month, value: newMonth, of: task.date) {
                        task.date = newDate
                        task.rolloverCount = 0 // reset
                    }
                }
            }

            updatedTasks.append(task)
        }

        tasks = updatedTasks
        saveTasks()
    }

    
    private func saveTasks() {
        if let encoded = try? JSONEncoder().encode(tasks) {
            UserDefaults.standard.set(encoded, forKey: "SavedTasks")
        }
    }

    private func loadTasks() {
        if let data = UserDefaults.standard.data(forKey: "SavedTasks"),
           let decoded = try? JSONDecoder().decode([ScheduledTask].self, from: data) {
            tasks = decoded
        }
    }

}
