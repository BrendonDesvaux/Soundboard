const fs = require('fs');
const path = require('path');
const soundboard = document.getElementById('soundboard');
const fileInput = document.getElementById('fileInput');
const chooseAndAddSoundButton = document.getElementById('chooseAndAddSound');
const soundListContainer = document.getElementById('soundListContainer'); // New container for sound list
const renameInput = document.getElementById('renameInput');
const renameConfirmButton = document.getElementById('renameConfirmButton');

const soundsDir = path.join(__dirname, 'sounds');
const soundsListPath = path.join(__dirname, 'soundsList.json');
let sounds = []; // List to hold sounds
let currentFilePath = ''; // To hold the file path of the sound being renamed

// Charger les sons au démarrage
function loadSounds() {
    if (fs.existsSync(soundsListPath)) {
        console.log('Loading sounds from soundsList.json');
        const soundsList = JSON.parse(fs.readFileSync(soundsListPath, 'utf-8'));
        console.log('Sounds list:', soundsList);
        soundsList.forEach(({ filePath, addedToUI, name }) => {
            if (filePath) {
                const sound = new Audio(filePath);
                sounds.push({ filePath, sound, addedToUI, name });
                addSoundToList(filePath, sound, name); // Add to list
                if (addedToUI) {
                    addSoundToUI(filePath, sound, name); // Add to UI if previously added
                }
            } else {
                console.error('Invalid filePath:', filePath);
            }
        });
    } else {
        console.log('soundsList.json does not exist');
    }
}

// Ajouter un son à la liste
function addSoundToList(filePath, sound, name) {
    console.log('Adding sound to list:', filePath);
    const listItem = document.createElement('div');
    listItem.className = 'sound-list-item';

    const addButton = document.createElement('button');
    addButton.textContent = `Add ${name || path.basename(filePath)}`;
    addButton.dataset.filepath = filePath;
    addButton.classList.add('add-button');
    if (sounds.find(s => s.filePath === filePath && s.addedToUI)) {
        addButton.textContent = 'Already in Soundboard';
        addButton.disabled = true;
    }
    addButton.addEventListener('click', () => {
        addSoundToUI(filePath, sound, name);
        updateSoundStatus(filePath, true); // Update status to added
        addButton.textContent = 'Already in Soundboard';
        addButton.disabled = true;
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
        const soundEntry = sounds.find(s => s.filePath === filePath);
        if (soundEntry && soundEntry.addButton) {
            soundEntry.addButton.textContent = `Add ${name || path.basename(filePath)}`;
            soundEntry.addButton.disabled = false;
        }
        soundListContainer.removeChild(listItem);
        sounds = sounds.filter(s => s.filePath !== filePath); // Remove from sounds array
        fs.unlinkSync(filePath); // Delete the sound file from disk
        updateSoundsList(); // Update the JSON file
    });

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => {
        renameInput.classList.remove('hidden');
        renameConfirmButton.classList.remove('hidden');
        renameInput.value = name || path.basename(filePath);
        currentFilePath = filePath;
    });

    listItem.appendChild(addButton);
    listItem.appendChild(editButton);
    listItem.appendChild(deleteButton);
    soundListContainer.appendChild(listItem);

    // Store reference to addButton in sounds array
    const soundEntry = sounds.find(s => s.filePath === filePath);
    if (soundEntry) {
        soundEntry.addButton = addButton;
    }
}

// Ajouter un son à l'interface utilisateur
function addSoundToUI(filePath, sound, name) {
    console.log('Adding sound to UI:', filePath);
    const soundContainer = document.createElement('div');
    soundContainer.className = 'sound-container';

    const button = document.createElement('button');
    button.classList.add('sound-button');
    button.textContent = name || path.basename(filePath);
    button.dataset.filepath = filePath;
    button.addEventListener('click', () => {
        sound.play();
    });

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Supprimer';
    removeButton.classList.add('remove-button');
    removeButton.addEventListener('click', () => {
        const soundEntry = sounds.find(s => s.filePath === filePath);
        if (soundEntry && soundEntry.addButton) {
            soundEntry.addButton.textContent = `Add ${name || path.basename(filePath)}`;
            soundEntry.addButton.disabled = false;
        }
        soundboard.removeChild(soundContainer);
        updateSoundStatus(filePath, false); // Update status to not added
    });

    const volumeControl = document.createElement('input');
    volumeControl.type = 'range';
    volumeControl.min = '0';
    volumeControl.max = '1';
    volumeControl.step = '0.01';
    volumeControl.value = sound.volume;
    volumeControl.addEventListener('input', () => {
        sound.volume = volumeControl.value;
    });

    soundContainer.appendChild(button);
    soundContainer.appendChild(removeButton);
    soundContainer.appendChild(volumeControl);
    soundboard.appendChild(soundContainer);

    console.log(`Son ajouté : ${name || path.basename(filePath)}`);
}

// Ajouter un son depuis le fichier sélectionné
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        const destPath = path.join(soundsDir, file.name);
        if (sounds.some(s => path.basename(s.filePath) === file.name)) {
            alert('A sound with this name already exists.');
            return;
        }
        fs.copyFileSync(file.path, destPath);
        const url = `file://${destPath}`;
        const sound = new Audio(url);

        const name = path.basename(file.name);
        sounds.push({ filePath: destPath, sound, addedToUI: false, name });
        addSoundToList(destPath, sound, name); // Add to list instead of UI
        fileInput.value = null; // Réinitialiser l'entrée de fichier
        updateSoundsList();
    }
});

// Mettre à jour le fichier JSON avec la liste des sons
function updateSoundsList() {
    const uniqueSounds = Array.from(new Set(sounds.map(s => s.filePath)))
        .map(filePath => {
            return sounds.find(s => s.filePath === filePath);
        });
    const soundFiles = uniqueSounds.map(s => ({ filePath: s.filePath, addedToUI: s.addedToUI, name: s.name }));
    fs.writeFileSync(soundsListPath, JSON.stringify(soundFiles, null, 2));
}

// Mettre à jour le statut du son
function updateSoundStatus(filePath, addedToUI) {
    const sound = sounds.find(s => s.filePath === filePath);
    if (sound) {
        sound.addedToUI = addedToUI;
        updateSoundsList();
    }
}

// Mettre à jour le nom du son
function updateSoundName(filePath, newName) {
    if (sounds.some(s => s.name === newName)) {
        alert('A sound with this name already exists.');
        return;
    }
    const sound = sounds.find(s => s.filePath === filePath);
    if (sound) {
        sound.name = newName;
        updateSoundsList();
        // Update the UI
        if (sound.addButton) {
            sound.addButton.textContent = `Add ${newName}`;
        }
        const soundContainerButton = document.querySelector(`.sound-container button[data-filepath="${filePath}"]`);
        if (soundContainerButton) {
            soundContainerButton.textContent = newName;
        }
    }
}

// Initialiser
loadSounds();

// Open file dialog when the button is clicked
chooseAndAddSoundButton.addEventListener('click', () => {
    fileInput.click();
});

// Confirm rename
renameConfirmButton.addEventListener('click', () => {
    const newName = renameInput.value;
    if (newName && currentFilePath) {
        updateSoundName(currentFilePath, newName);
        renameInput.classList.add('hidden');
        renameConfirmButton.classList.add('hidden');
        currentFilePath = '';
        soundListContainer.innerHTML = '';
        loadSounds();
    }
});