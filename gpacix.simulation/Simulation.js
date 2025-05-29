'format esm'; 
// MySimulation.js - Converted to Native ECMAScript Modules (ESM) syntax
// Corrected Imports and Native Class Declarations

// 1. Core Morphic/Graphics components
//import { Rectangle, Text, Box, Color, World } from '/lively.graphics'; // Corrected: lively.graphics
//import { Button } from '/lively.morphic.widgets'; // Buttons are often in a separate widgets package
// Uh, lively.morphic.widgets DOESN'T EXIST.
/// Box, Button, Clipboard? (Where did I get Clipboard from?)
import { Rectangle, Color } from '/lively.graphics';
import { World, Text, Morph as Box } from '/lively.morphic';
import { ButtonDefault as Button } from '/lively.components';

//export function foo() { console.log('Foo.'); };
//export { World };
//
//import { Clipboard } from '/lively.morphic'; // Clipboard should still be in lively.morphic

// No longer importing 'declare' from 'lively.lang.Class' as we'll use native 'class' syntax

// ===========================================================================
// 1. Constants and Global Mappings
// ===========================================================================

const taskColors = {
    "Front-End": "lightblue",
    "Back-End": "lightcoral",
    "DB": "lightgreen",
    "Testing": "lightgoldenrodyellow",
    "Ops": "plum",
    "completed": "gray"
};

const MAX_FPS = 60;
const STEPS = 100; // Progress steps for a task
const MOVE_SPEED_PER_FRAME = 5; // Pixels per frame

const skillMap = {
    'F': 'Front-End',
    'B': 'Back-End',
    'D': 'DB',
    'T': 'Testing',
    'O': 'Ops'
};

// Global-ish completedSlots (will be managed by SimulationWorld instance)
let completedSlotsTemplate = [];
for (let i = 680; i > 0; i -= 80) completedSlotsTemplate.push(i);


// ===========================================================================
// 2. Helper Functions
// ===========================================================================

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function findAvailablePerson(skill, peopleArray) {
    return peopleArray.find(person => person.skills.includes(skill) && !person.busy);
}

// ===========================================================================
// 3. Person Morph - Now a Native Class
// ===========================================================================

export class PersonMorph extends Rectangle { // Native class syntax
    static get properties() { // Static properties for declaration-like setup
        return {
            isPersonMorph: { defaultValue: true },
            name: { defaultValue: null },
            skills: { defaultValue: [] },
            currentTask: { defaultValue: null },
            progress: { defaultValue: 0 },
            currentChange: { defaultValue: null },
            busy: { defaultValue: false }
        };
    }

    // Constructor replaces initialize
    constructor(name, skills, x, y) {
        super(lively.rect(x, y, 60, 60)); // lively.rect is assumed global or internally handled
        this.name = name;
        this.skills = skills;
        this.setFill(taskColors[this.skills[0]] || 'lightgray');
        this.setBorderWidth(0);
        this.setDroppable(false);
        this.setGrabbable(false);

        // Add name text as a submorph
        let nameText = new Text(lively.rect(0, 5, 60, 20), this.name)
                           .setTextAlign('center').setFontSize(12).setHandStyle('auto');
        this.addMorph(nameText);

        // Add skill text as a submorph
        let skillText = new Text(lively.rect(0, 25, 60, 20), '(' + this.skills.join(',') + ')')
                           .setTextAlign('center').setFontSize(10).setHandStyle('auto');
        this.addMorph(skillText);
    }

    updateVisuals() { // No 'function' keyword for methods in native classes
        if (this.currentTask) {
            this.setBorderColor(Color.black);
            this.setBorderWidth(4);
        } else {
            this.setBorderWidth(0);
        }
    }
}


// ===========================================================================
// 4. Change Morph - Now a Native Class
// ===========================================================================

let nextChangeId = 1; // Module-level counter for Change IDs

export class ChangeMorph extends Rectangle { // Native class syntax
    static get properties() { // Static properties for declaration-like setup
        return {
            isChangeMorph: { defaultValue: true },
            id: { defaultValue: null },
            name: { defaultValue: null },
            taskSequence: { defaultValue: [] },
            completedTasks: { defaultValue: [] },
            status: { defaultValue: "notStarted" }, // notStarted, waiting, inProgress, completed, done
            taskProgress: { defaultValue: 0 },
            currentPerson: { defaultValue: null },
            currentTask: { defaultValue: null },
            destinationX: { defaultValue: 0 },
            destinationY: { defaultValue: 0 },
            stateStartTime: { defaultValue: 0 }
        };
    }

    constructor(taskSequence, x, y, name = "Change " + nextChangeId++) {
        super(lively.rect(x, y, 50, 50));
        this.id = nextChangeId - 1; // Assign current ID
        this.name = name;
        this.taskSequence = taskSequence;
        this.completedTasks = [];
        this.status = "notStarted";
        this.destinationX = x;
        this.destinationY = y;
        this.stateStartTime = this.world() ? this.world().time : 0;

        this.setFill(taskColors[this.taskSequence[0]] || 'lightgray');
        this.setClipMode('hidden');
        this.setBorderWidth(0);
        this.setDroppable(false);
        this.setGrabbable(true);

        // Add name text as a submorph
        let nameText = new Text(lively.rect(0, 10, 50, 30), this.name)
                           .setTextAlign('center').setFontSize(10).setHandStyle('auto');
        this.addMorph(nameText);
    }

    static resetIDs() { // Static method for class-level functionality
        nextChangeId = 1;
    }

    update(peopleArray, completedSlotsArray) {
        const world = this.world();
        const time = world ? world.time : 0;

        if (this.status === "completed") {
            let currentCenter = this.getCenter();
            let targetCenter = lively.pt(this.destinationX, this.destinationY);
            let dist = currentCenter.dist(targetCenter);

            if (dist > MOVE_SPEED_PER_FRAME) {
                let angle = Math.atan2(targetCenter.y - currentCenter.y, targetCenter.x - currentCenter.x);
                this.moveBy(lively.pt(Math.cos(angle) * MOVE_SPEED_PER_FRAME, Math.sin(angle) * MOVE_SPEED_PER_FRAME));
            } else {
                this.setCenter(targetCenter);
                this.status = "done";
                this.stateStartTime = time;
                this.remove();
            }
            return;
        }

        if (this.status === "inProgress") {
            this.taskProgress += 1;
            this.currentPerson.progress += 1;

            if (this.taskProgress >= STEPS) {
                this.completedTasks.push(this.currentTask);
                this.currentPerson.progress = 0;
                this.currentPerson.currentTask = null;
                this.currentPerson.currentChange = null;
                this.currentPerson.busy = false;
                this.currentTask = null;

                this.taskProgress = 0;

                if (this.completedTasks.length === this.taskSequence.length) {
                    this.status = "completed";
                    this.stateStartTime = time;
                    let nextSlotY = completedSlotsArray.shift();
                    this.setDestination(1250, nextSlotY);
                    this.currentPerson = null;
                } else if (this.currentPerson && this.currentPerson.skills.includes(this.taskSequence[this.completedTasks.length])) {
                    this.status = "inProgress";
                    this.currentTask = this.taskSequence[this.completedTasks.length];
                    this.stateStartTime = time;
                    this.setFill(taskColors[this.currentTask]);
                    this.currentPerson.currentTask = this.currentTask;
                    this.currentPerson.currentChange = this;
                } else {
                    this.status = "waiting";
                    this.stateStartTime = time;
                    this.currentPerson = null;
                    this.setFill(taskColors[this.taskSequence[this.completedTasks.length]] || 'gray');
                }
            }
            return;
        }

        if (this.status === "notStarted" || this.status === "waiting") {
            const nextRequiredSkill = this.taskSequence[this.completedTasks.length];
            this.setFill(taskColors[nextRequiredSkill] || 'gray');

            const availablePerson = findAvailablePerson(nextRequiredSkill, peopleArray);

            if (availablePerson) {
                this.status = "inProgress";
                this.stateStartTime = time;
                this.taskProgress = 0;
                this.currentTask = nextRequiredSkill;
                this.currentPerson = availablePerson;
                availablePerson.currentChange = this;
                availablePerson.currentTask = nextRequiredSkill;
                availablePerson.busy = true;

                this.setCenter(availablePerson.getCenter().addXY(0, 80));
            } else {
                if (this.status === "notStarted") {
                    this.status = "waiting";
                    this.stateStartTime = time;
                }
            }
        }
    }

    setDestination(x, y) {
        this.destinationX = x;
        this.destinationY = y;
    }

    updateVisuals() {
        if (this.status === "completed" || this.status === "done") {
            this.setFill(taskColors.completed);
        } else if (this.status === "waiting" && this.taskSequence[this.completedTasks.length]) {
            this.setFill(taskColors[this.taskSequence[this.completedTasks.length]]);
        } else if (this.status === "inProgress" && this.currentTask) {
            this.setFill(taskColors[this.currentTask]);
        }
        if (this.status === "inProgress" || this.status === "waiting") {
             this.setBorderColor(Color.black);
             this.setBorderWidth(2);
        } else {
             this.setBorderWidth(0);
        }
    }
}

// ===========================================================================
// 5. Main Simulation World Morph - Now a Native Class
// ===========================================================================

export class SimulationWorld extends Box { // Native class syntax
    static get properties() {
        return {
            isSimulationWorld: { defaultValue: true },
            people: { defaultValue: [] },
            changes: { defaultValue: [] },
            completedSlots: { defaultValue: [] },
            dynamicChangeCounter: { defaultValue: 0 },
            isPaused: { defaultValue: false },
            metrics: { defaultValue: {} },
            metricsTableMorph: { defaultValue: null },
            simArea: { defaultValue: null },
            helpMenuMorph: { defaultValue: null },

            // UI morphs references
            addChangeButton: { defaultValue: null },
            pauseButton: { defaultValue: null },
            fastButton: { defaultValue: null },
            oneXButton: { defaultValue: null },
            resetButton: { defaultValue: null },
            helpButton: { defaultValue: null },
            customPeopleTextarea: { defaultValue: null },
            customChangesTextarea: { defaultValue: null }
        };
    }

    constructor(bounds) {
        super(bounds || lively.rect(0, 0, 1400, 850));
        this.setFill(Color.white);
        this.setBorderWidth(1).setBorderColor(Color.black);
        this.setClipMode('hidden');

        this.people = [];
        this.changes = [];
        this.completedSlots = [...completedSlotsTemplate];

        this.setupUI();
        this.resetSimulation();
    }

    // This method is called automatically by Lively's world loop for morphs
    onRefresh(interval) { // No 'function' keyword for methods in native classes
        super.onRefresh(interval);
        if (this.isPaused) return;

        this.changes.forEach(change => {
            change.update(this.people, this.completedSlots);
            change.updateVisuals();
        });

        this.people.forEach(person => {
            person.updateVisuals();
        });

        this.changes = this.changes.filter(c => c.status !== "done");

        this.updateMetrics();
        this.updateMetricsTable();
    }

    openInWorld(world, position) {
        world = world || World.current;
        position = position || world.center;
        this.setPosition(position.subPt(this.extent().scaleBy(0.5)));
        world.addMorph(this);
        this.startStepping(this.onRefresh);
    }

    // ===========================================================================
    // 6. UI Setup Methods
    // ===========================================================================

    setupUI() {
        const simAreaBounds = lively.rect(0, 0, 1200, 700);
        const simArea = new Box(simAreaBounds);
        simArea.setFill(Color.white);
        simArea.setBorderWidth(1).setBorderColor(Color.darkGray);
        simArea.setGrabbable(false);
        this.addMorph(simArea);
        this.simArea = simArea;

        const controlsPanelBounds = lively.rect(1205, 0, 190, 800);
        const controlsPanel = new Box(controlsPanelBounds);
        controlsPanel.setFill(Color.lightgray);
        controlsPanel.setBorderWidth(1);
        this.addMorph(controlsPanel);

        let currentY = 10;
        const buttonHeight = 30;
        const buttonWidth = 170;
        const padding = 10;
        const spacing = 5;

        const addButton = (parentMorph, label, action) => {
            let button = new Button(lively.rect(padding, currentY, buttonWidth, buttonHeight));
            button.setLabel(label);
            button.setHandStyle('pointer');
            button.onMouseUp = action;
            parentMorph.addMorph(button);
            currentY += (buttonHeight + spacing);
            return button;
        };

        this.addChangeButton = addButton(controlsPanel, "Add Change (N)", () => this.addChange());
        this.pauseButton = addButton(controlsPanel, "Pause (P)", () => this.pauseSimulation());
        this.fastButton = addButton(controlsPanel, "Fast (F)", () => this.setSpeed(2));
        this.oneXButton = addButton(controlsPanel, "1X (1)", () => this.setSpeed(1));
        this.resetButton = addButton(controlsPanel, "Reset (R)", () => this.resetSimulation());
        this.helpButton = addButton(controlsPanel, "Help (?)", () => this.toggleHelpMenu());

        currentY += spacing * 2;

        let peopleHeader = new Text(lively.rect(padding, currentY, buttonWidth, 20), "Define People (Name: FBDO):");
        peopleHeader.setFontSize(12).setHandStyle('auto');
        controlsPanel.addMorph(peopleHeader);
        currentY += 20 + spacing;

        let fillDefaultPeopleBtn = new Button(lively.rect(padding, currentY, buttonWidth, 25));
        fillDefaultPeopleBtn.setLabel("Fill Default People");
        fillDefaultPeopleBtn.onMouseUp = () => this.fillDefaultPeople();
        controlsPanel.addMorph(fillDefaultPeopleBtn);
        currentY += 25 + spacing;

        this.customPeopleTextarea = new Text(lively.rect(padding, currentY, buttonWidth, 80), "");
        this.customPeopleTextarea.isTextarea = true;
        this.customPeopleTextarea.setCanBeGrabbed(false);
        this.customPeopleTextarea.respondsToKeyboard = true;
        this.customPeopleTextarea.setHandStyle('auto');
        this.customPeopleTextarea.setClipMode('auto');
        this.customPeopleTextarea.setBorderWidth(1).setBorderColor(Color.black);
        controlsPanel.addMorph(this.customPeopleTextarea);
        currentY += 80 + spacing * 2;

        let changesHeader = new Text(lively.rect(padding, currentY, buttonWidth, 20), "Define Custom Changes (Name: BBFFDTTO):");
        changesHeader.setFontSize(12).setHandStyle('auto');
        controlsPanel.addMorph(changesHeader);
        currentY += 20 + spacing;

        let fillDefaultChangesBtn = new Button(lively.rect(padding, currentY, buttonWidth, 25));
        fillDefaultChangesBtn.setLabel("Fill Default Changes");
        fillDefaultChangesBtn.onMouseUp = () => this.fillDefaultChanges();
        controlsPanel.addMorph(fillDefaultChangesBtn);
        currentY += 25 + spacing;

        this.customChangesTextarea = new Text(lively.rect(padding, currentY, buttonWidth, 80), "");
        this.customChangesTextarea.isTextarea = true;
        this.customChangesTextarea.setCanBeGrabbed(false);
        this.customChangesTextarea.respondsToKeyboard = true;
        this.customChangesTextarea.setHandStyle('auto');
        this.customChangesTextarea.setClipMode('auto');
        this.customChangesTextarea.setBorderWidth(1).setBorderColor(Color.black);
        controlsPanel.addMorph(this.customChangesTextarea);
        currentY += 80 + spacing * 2;

        let runSimButton = new Button(lively.rect(padding, currentY, buttonWidth, buttonHeight));
        runSimButton.setLabel("Run Simulation");
        runSimButton.onMouseUp = () => this.runSimulation();
        controlsPanel.addMorph(runSimButton);
        currentY += buttonHeight + spacing;

        this.metricsTableMorph = new Text(lively.rect(10, simArea.getBottom() + 10, simArea.width - 20, 100), "");
        this.metricsTableMorph.setReadonly(true);
        this.metricsTableMorph.setClipMode('auto');
        this.metricsTableMorph.setFontFamily('monospace');
        this.metricsTableMorph.setBorderWidth(1).setBorderColor(Color.black);
        this.addMorph(this.metricsTableMorph);

        let copyMetricsButton = new Button(lively.rect(this.metricsTableMorph.getRight() - 100, this.metricsTableMorph.getTop() - 25, 90, 20));
        copyMetricsButton.setLabel("Copy Metrics");
        copyMetricsButton.onMouseUp = () => this.copyMetricsToClipboard();
        this.addMorph(copyMetricsButton);

        this.helpMenuMorph = new Text(lively.rect(50, 50, 1000, 600), "").setReadonly(true);
        this.helpMenuMorph.setFill(Color.darkgray.withA(0.9));
        this.helpMenuMorph.setTextColor(Color.white);
        this.helpMenuMorph.setZIndex(100);
        this.helpMenuMorph.beInvisible();
        this.addMorph(this.helpMenuMorph);
        this.createHelpMenuContent();

        World.current().addKeyHandler({
            onKeyDown: (evt) => {
                if (evt.target instanceof Text && (evt.target.isTextarea || evt.target.isEditable())) {
                    return false;
                }

                if (evt.key === 'p' || evt.key === 'P') {
                    this.pauseSimulation();
                } else if (evt.key === 'f' || evt.key === 'F') {
                    this.setSpeed(2);
                } else if (evt.key === 's' || evt.key === 'S') {
                    this.setSpeed(0.5);
                } else if (evt.key === 'n' || evt.key === 'N') {
                    this.addChange();
                } else if (evt.key === 'r' || evt.key === 'R') {
                    this.resetSimulation();
                } else if (evt.key === '?') {
                    this.toggleHelpMenu();
                }
                return true;
            },
            onKeyUp: (evt) => {
                if (evt.key === 's' || evt.key === 'S' || evt.key === 'f' || evt.key === 'F') {
                    this.setSpeed(1);
                }
                return true;
            }
        });
    }

    // ===========================================================================
    // 7. Simulation Control Methods
    // ===========================================================================

    createDefaultChanges() {
        this.changes.forEach(c => c.remove());
        this.changes = [];

        ChangeMorph.resetIDs();

        [
            { tasks: ["Front-End", "Front-End", "Back-End", "Back-End", "DB", "Testing", "Testing", "Ops"], name: "Both 1" },
            { tasks: ["Back-End", "Back-End", "DB", "DB", "Testing", "Testing", "Ops", "Ops"], name: "Back 1" },
            { tasks: ["DB", "DB", "DB", "Testing", "Ops"], name: "DB-only 1" },
            { tasks: ["Front-End", "Front-End", "Back-End", "Back-End", "DB", "Testing", "Testing", "Ops"], name: "Both 2" },
            { tasks: ["Back-End", "Back-End", "DB", "DB", "Testing", "Testing", "Ops", "Ops"], name: "Back 2" },
            { tasks: ["DB", "DB", "DB", "Testing", "Ops"], name: "DB-only 2" },
            { tasks: ["Front-End", "Front-End", "Back-End", "Back-End", "DB", "Testing", "Testing", "Ops"], name: "Both 3" },
            { tasks: ["Back-End", "Back-End", "DB", "DB", "Testing", "Testing", "Ops", "Ops"], name: "Back 3" },
            { tasks: ["DB", "DB", "DB", "Testing", "Ops"], name: "DB-only 3" }
        ].forEach((data, i) => {
            const change = new ChangeMorph(data.tasks, 50 + (i % 3) * 50, 50 + Math.floor(i / 3) * 80 + 100, data.name);
            this.changes.push(change);
            this.simArea.addMorph(change);
        });
    }

    createDefaultPeople() {
        this.people.forEach(p => p.remove());
        this.people = [];

        [
            { name: "Al", skills: ["Front-End"], x: 150 },
            { name: "Alice", skills: ["Front-End"], x: 250 },
            { name: "Bob", skills: ["Back-End"], x: 400 },
            { name: "Charlie", skills: ["DB"], x: 600 },
            { name: "Dana", skills: ["Testing"], x: 800 },
            { name: "Dan", skills: ["Testing"], x: 900 },
            { name: "Ellen", skills: ["Ops"], x: 1000 }
        ].forEach(data => {
            const person = new PersonMorph(data.name, data.skills, data.x, 100);
            this.people.push(person);
            this.simArea.addMorph(person);
        });
    }

    addChange() {
        this.dynamicChangeCounter++;
        const allSkills = Array.from(new Set(this.people.flatMap(p => p.skills)));
        const randomTaskSequence = Array.from({
            length: 5
        }, () => allSkills[Math.floor(Math.random() * allSkills.length)]);
        const newChange = new ChangeMorph(randomTaskSequence, 50, 40, "Dynamic " + this.dynamicChangeCounter);
        this.changes.push(newChange);
        this.simArea.addMorph(newChange);
    }

    pauseSimulation() {
        this.isPaused = !this.isPaused;
        this.pauseButton.setLabel(this.isPaused ? "Resume (P)" : "Pause (P)");
    }

    setSpeed(factor) {
        const defaultMsPerFrame = 1000 / MAX_FPS;
        this.setRefreshPeriod(defaultMsPerFrame / factor);

        this.fastButton.setLabel(factor === 2 ? "FAST (F)" : "Fast (F)");
        this.oneXButton.setLabel(factor === 1 ? "1X (1)" : "1X (1)");
    }

    resetSimulation() {
        this.changes.forEach(c => c.remove());
        this.changes = [];

        this.people.forEach(person => {
            person.currentTask = null;
            person.progress = 0;
            person.currentChange = null;
            person.busy = false;
            person.updateVisuals();
        });

        ChangeMorph.resetIDs();
        this.dynamicChangeCounter = 0;

        this.createDefaultChanges();
        this.createDefaultPeople();

        this.completedSlots = [...completedSlotsTemplate];

        this.isPaused = false;
        this.pauseButton.setLabel("Pause (P)");

        this.updateMetrics(true);
    }

    getDefaultChangesAsText() {
        return `Both 1: BBFFDTTO
Back 1: BBDBTTOO
DB-only 1: DDDTO
Both 2: BBFFDTTO
Back 2: BBDBTTOO
DB-only 2: DDDTO
Both 3: BBFFDTTO
Back 3: BBDBTTOO
DB-only 3: DDDTO`;
    }

    fillDefaultChanges() {
        this.customChangesTextarea.textString = this.getDefaultChangesAsText();
    }

    getDefaultPeopleAsText() {
        return `Al: F
Alice: F
Bob: B
Charlie: D
Dana: T
Dan: T
Ellen: O`;
    }

    fillDefaultPeople() {
        this.customPeopleTextarea.textString = this.getDefaultPeopleAsText();
    }

    parseUserChanges() {
        this.changes.forEach(c => c.remove());
        this.changes = [];

        const lines = this.customChangesTextarea.textString.split('\n').filter(line => line.trim() !== '');
        let changeY = 150;
        const changeX = 50;
        const yIncrement = 80;

        ChangeMorph.resetIDs();

        lines.forEach(line => {
            const parts = line.split(':');
            if (parts.length === 2) {
                const name = parts[0].trim();
                const taskString = parts[1].trim().replace(/\s/g, '');
                const taskSequence = Array.from(taskString).map(char => skillMap[char.toUpperCase()]).filter(skill => skill);
                if (taskSequence.length > 0) {
                    const newChange = new ChangeMorph(taskSequence, changeX, changeY, name);
                    this.changes.push(newChange);
                    this.simArea.addMorph(newChange);
                    changeY += yIncrement;
                }
            }
        });
    }

    parseUserPeople() {
        this.people.forEach(p => p.remove());
        this.people = [];

        const lines = this.customPeopleTextarea.textString.split('\n').filter(line => line.trim() !== '');
        let currentX = 150;
        const startY = 100;
        const xIncrement = 100;

        lines.forEach(line => {
            const parts = line.split(':');
            if (parts.length === 2) {
                const name = parts[0].trim();
                const skillString = parts[1].trim().replace(/\s/g, '');
                const skills = Array.from(skillString).map(char => skillMap[char.toUpperCase()]).filter(skill => skill);
                if (skills.length > 0) {
                    const newPerson = new PersonMorph(name, skills, currentX, startY);
                    this.people.push(newPerson);
                    this.simArea.addMorph(newPerson);
                    currentX += xIncrement;
                }
            }
        });
    }

    runSimulation() {
        this.changes.forEach(c => c.remove());
        this.people.forEach(p => p.remove());

        ChangeMorph.resetIDs();
        this.dynamicChangeCounter = 0;

        if (this.customChangesTextarea.textString.trim() !== "") {
            this.parseUserChanges();
        } else {
            this.createDefaultChanges();
        }

        if (this.customPeopleTextarea.textString.trim() !== "") {
            this.parseUserPeople();
        } else {
            this.createDefaultPeople();
        }

        this.people.forEach(person => {
            person.currentTask = null;
            person.progress = 0;
            person.currentChange = null;
            person.busy = false;
            person.updateVisuals();
        });

        this.completedSlots = [...completedSlotsTemplate];

        this.isPaused = false;
        this.pauseButton.setLabel("Pause (P)");

        this.updateMetrics(true);
    }

    // ===========================================================================
    // 8. Metrics and Help Menu
    // ===========================================================================

    updateMetrics(reset = false) {
        const time = this.world() ? this.world().time : 0;
        if (reset) {
            this.metrics = {};
        }

        this.changes.forEach(change => {
            if (!this.metrics[change.id]) {
                this.metrics[change.id] = {
                    name: change.name,
                    notStarted: 0,
                    waiting: 0,
                    inProgress: 0,
                    completed: 0,
                    status: change.status
                };
            }
            const currentStatus = change.status;
            if (currentStatus !== "done") {
                this.metrics[change.id][currentStatus]++;
                this.metrics[change.id].status = currentStatus;
            }
        });

        Object.keys(this.metrics).forEach(id => {
            if (!this.changes.some(c => c.id == id) && this.metrics[id].status !== "done") {
                this.metrics[id].status = "done";
                this.metrics[id].completed++;
            }
        });
    }

    updateMetricsTable() {
        let tableText = "Change State Durations (Frames)\n";
        tableText += "--------------------------------------------------------------------------------------\n";
        tableText += "Name          | Not Started | Waiting     | In Progress | Completed   | Total\n";
        tableText += "--------------------------------------------------------------------------------------\n";

        let totalOverall = 0;
        for (const id in this.metrics) {
            const data = this.metrics[id];
            const totalChange = data.notStarted + data.waiting + data.inProgress + data.completed;
            totalOverall += totalChange;

            tableText += String(data.name).padEnd(13) + "| ";
            tableText += String(data.notStarted).padEnd(12) + "| ";
            tableText += String(data.waiting).padEnd(12) + "| ";
            tableText += String(data.inProgress).padEnd(12) + "| ";
            tableText += String(data.completed).padEnd(12) + "| ";
            tableText += String(totalChange) + "\n";
        }

        tableText += `\nOverall Total: ${totalOverall} frames`;

        this.metricsTableMorph.textString = tableText;
    }

    copyMetricsToClipboard() {
        let clipboardText = "";
        clipboardText += "Name\tNot Started\tWaiting\tIn Progress\tCompleted\tTotal\n";

        let totalOverall = 0;
        for (const id in this.metrics) {
            const data = this.metrics[id];
            const totalChange = data.notStarted + data.waiting + data.inProgress + data.completed;
            totalOverall += totalChange;

            clipboardText += `${data.name}\t${data.notStarted}\t${data.waiting}\t${data.inProgress}\t${data.completed}\t${totalChange}\n`;
        }
        clipboardText += `\nOverall Total:\t${totalOverall} frames`;

        //TODO: figure this out later. Clipboard.current().setText(clipboardText);
        World.current().setStatusMessage("Metrics copied to clipboard!", Color.green);
    }

    createHelpMenuContent() {
        const helpText = `
            SIMULATION HELP:

            Keyboard Shortcuts:
            P: Pause/Resume simulation
            F: Speed up simulation (hold)
            S: Slow down simulation (hold)
            N: Add a new random Change
            R: Reset simulation to default state
            ?: Toggle this Help Menu

            Simulation Elements:
            - Rectangles: Represent Changes moving through the system.
            - People: Boxes with names and skills (e.g., Al (Front-End)).
            - Tasks: Each Change has a sequence of tasks (Front-End, Back-End, DB, Testing, Ops).
            - Progress: People work on Changes, visually implied by Change/Person states.

            Change States:
            - Not Started: Initial state.
            - Waiting: Waiting for a person with the required skill.
            - In Progress: A person is actively working on the task.
            - Completed: All tasks done, Change moves to the right.
            - Done: Change has reached the completed area and is removed.

            Customization:
            - Define Custom Changes: Enter changes in 'Name: Skills' format (e.g., My Change: BBFFTTO).
            - Define People: Enter people in 'Name: Skills' format (e.g., Dev 1: FBO).
            - Run Simulation: Start the simulation with the defined custom changes/people, or defaults if textareas are empty.

            Metrics Table:
            - Shows the time (in frames) each Change spends in different states.
        `;
        this.helpMenuMorph.textString = helpText;
        this.helpMenuMorph.setBounds(World.current().visibleBounds().insetBy(20));
    }

    toggleHelpMenu() {
        this.helpMenuMorph.toggleVisibility();
    }
}
