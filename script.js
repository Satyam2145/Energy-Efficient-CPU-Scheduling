// CPU and Task classes to mirror the Python implementation
class CPU {
    constructor(name, domain, basePower, maxFreq) {
        this.name = name;
        this.domain = domain;
        this.basePower = basePower;
        this.maxFreq = maxFreq;
        this.currentFreq = maxFreq;
        this.utilization = 0;
        this.tasks = [];
    }

    calculateEnergy(task) {
        const freqRatio = this.currentFreq / this.maxFreq;
        const utilization = Math.min(1.0, this.utilization + task.estimatedUtilization);
        return this.basePower * freqRatio * utilization;
    }

    adjustFrequency(targetUtilization) {
        this.currentFreq = Math.min(
            this.maxFreq,
            Math.max(this.maxFreq * 0.1, this.maxFreq * targetUtilization)
        );
    }
}

class Task {
    constructor(name, estimatedUtilization) {
        this.name = name;
        this.estimatedUtilization = estimatedUtilization;
    }
}

class EnergyEfficientScheduler {
    constructor(cpus) {
        this.cpus = cpus;
        this.tasks = [];
        this.profilingData = {};
        this.results = [];
    }

    addTask(task) {
        this.tasks.push(task);
        this.updateTaskList();
    }

    profileTask(task) {
        if (!this.profilingData[task.name]) {
            this.profilingData[task.name] = {
                avgUtilization: task.estimatedUtilization,
                executionCount: 1
            };
        } else {
            const profile = this.profilingData[task.name];
            profile.avgUtilization = (
                (profile.avgUtilization * profile.executionCount + task.estimatedUtilization) /
                (profile.executionCount + 1)
            );
            profile.executionCount++;
        }
    }

    findOptimalCpu(task) {
        let minEnergy = Infinity;
        let selectedCpu = null;

        for (const cpu of this.cpus) {
            if (cpu.utilization + task.estimatedUtilization <= 1.0) {
                const energy = cpu.calculateEnergy(task);
                if (energy < minEnergy) {
                    minEnergy = energy;
                    selectedCpu = cpu;
                }
            }
        }

        return selectedCpu;
    }

    scheduleTasks() {
        this.results = [];
        // Reset CPU states
        this.cpus.forEach(cpu => {
            cpu.utilization = 0;
            cpu.currentFreq = cpu.maxFreq;
            cpu.tasks = [];
            this.updateCpuUI(cpu);
        });

        for (const task of this.tasks) {
            this.profileTask(task);
            const cpu = this.findOptimalCpu(task);
            
            if (cpu) {
                cpu.tasks.push(task);
                cpu.utilization += task.estimatedUtilization;
                cpu.adjustFrequency(cpu.utilization);
                
                const result = {
                    task: task.name,
                    cpu: cpu.name,
                    domain: cpu.domain,
                    frequency: cpu.currentFreq.toFixed(2),
                    energy: cpu.calculateEnergy(task).toFixed(2)
                };
                
                this.results.push(result);
                this.logResult(result);
                this.updateCpuUI(cpu);
            } else {
                this.logMessage(`No suitable CPU found for task ${task.name}`);
            }
        }

        this.updateEnergyChart();
    }

    updateTaskList() {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';
        
        this.tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${task.name} (Utilization: ${task.estimatedUtilization})</span>
                <button class="remove-task" data-index="${index}">Remove</button>
            `;
            taskList.appendChild(li);
        });

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-task').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                this.tasks.splice(index, 1);
                this.updateTaskList();
            });
        });
    }

    updateCpuUI(cpu) {
        const freqElement = document.getElementById(`${cpu.name}-freq`);
        const utilElement = document.getElementById(`${cpu.name}-util`);
        const barElement = document.getElementById(`${cpu.name}-bar`);

        if (freqElement) freqElement.textContent = `${cpu.currentFreq.toFixed(2)} GHz`;
        if (utilElement) utilElement.textContent = `${(cpu.utilization * 100).toFixed(0)}%`;
        if (barElement) barElement.style.width = `${cpu.utilization * 100}%`;
    }

    logResult(result) {
        this.logMessage(
            `Executing ${result.task} on ${result.cpu} (Domain: ${result.domain})<br>` +
            `CPU Frequency: ${result.frequency} GHz<br>` +
            `Estimated Energy: ${result.energy} W`
        );
    }

    logMessage(message) {
        const log = document.getElementById('resultsLog');
        log.innerHTML += `<p>${message}</p>`;
        log.scrollTop = log.scrollHeight;
    }

    updateEnergyChart() {
        const chartContainer = document.getElementById('energyChart');
        chartContainer.innerHTML = '';

        // Group results by CPU
        const cpuEnergy = {};
        this.results.forEach(result => {
            if (!cpuEnergy[result.cpu]) {
                cpuEnergy[result.cpu] = 0;
            }
            cpuEnergy[result.cpu] += parseFloat(result.energy);
        });

        // Create bars for each CPU
        for (const [cpu, energy] of Object.entries(cpuEnergy)) {
            const bar = document.createElement('div');
            bar.className = `chart-bar ${this.getCpuDomain(cpu)}-bar`;
            bar.style.height = `${Math.min(100, energy * 10)}%`;
            bar.setAttribute('data-value', `${energy.toFixed(2)}W`);
            bar.setAttribute('title', `${cpu}: ${energy.toFixed(2)}W`);
            chartContainer.appendChild(bar);
        }
    }

    getCpuDomain(cpuName) {
        const cpu = this.cpus.find(c => c.name === cpuName);
        return cpu ? cpu.domain.toLowerCase() : '';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Create CPU instances
    const cpus = [
        new CPU("BigCore1", "performance", 10.0, 3.0),
        new CPU("BigCore2", "performance", 10.0, 3.0),
        new CPU("LittleCore1", "efficiency", 2.0, 1.5),
        new CPU("LittleCore2", "efficiency", 2.0, 1.5)
    ];

    // Create scheduler
    const scheduler = new EnergyEfficientScheduler(cpus);

    // Add task button event
    document.getElementById('addTask').addEventListener('click', () => {
        const taskName = document.getElementById('taskName').value;
        const utilization = parseFloat(document.getElementById('utilization').value);
        
        if (taskName && !isNaN(utilization) && utilization > 0 && utilization <= 1) {
            scheduler.addTask(new Task(taskName, utilization));
            document.getElementById('taskName').value = '';
        } else {
            alert('Please enter a valid task name and utilization value (0.1-1.0)');
        }
    });

    // Schedule button event
    document.getElementById('scheduleButton').addEventListener('click', () => {
        if (scheduler.tasks.length > 0) {
            document.getElementById('resultsLog').innerHTML = '';
            scheduler.scheduleTasks();
        } else {
            alert('Please add at least one task to schedule');
        }
    });

    // Add some example tasks
    scheduler.addTask(new Task("Task1", 0.3));
    scheduler.addTask(new Task("Task2", 0.5));
    scheduler.addTask(new Task("Task3", 0.2));
    scheduler.addTask(new Task("Task4", 0.8));
});