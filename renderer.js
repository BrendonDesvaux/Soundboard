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
    deleteButton.textContent = 'X';
    deleteButton.classList.add('delete-button');
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
    editButton.classList.add('edit-button');
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

// Ajouter un bouton pour activer/désactiver la réverbération
const reverbToggleButton = document.createElement('button');
reverbToggleButton.textContent = 'Reverb off';
reverbToggleButton.classList.add('button');
soundboard.appendChild(reverbToggleButton);

// Ajouter un bouton pour activer/désactiver l'écho
const echoToggleButton = document.createElement('button');
echoToggleButton.textContent = 'Echo off';
echoToggleButton.classList.add('button');
soundboard.appendChild(echoToggleButton);

let audioContext;
let mediaStreamSource;
let reverbEnabled = false;
let echoEnabled = false;
let reverbNode;
let echoNode;
let feedbackNode;

reverbToggleButton.addEventListener('click', async() => {
    if (!audioContext) {
        audioContext = new(window.AudioContext || window.webkitAudioContext)();
    }

    if (!reverbEnabled) {
        if (!mediaStreamSource) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
        }

        // Utiliser Tone.js pour la réverbération
        reverbNode = new Tone.Reverb().toDestination();
        const mic = new Tone.UserMedia().connect(reverbNode);
        await mic.open();

        reverbToggleButton.textContent = 'Reverb on';
        reverbToggleButton.style.backgroundColor = 'green';
    } else {
        // Désactiver la réverbération
        reverbNode.disconnect();
        reverbNode = null;

        reverbToggleButton.textContent = 'Reverb off';
        reverbToggleButton.style.backgroundColor = '#6b6b6b';
    }

    reverbEnabled = !reverbEnabled;
});

echoToggleButton.addEventListener('click', async() => {
    if (!audioContext) {
        audioContext = new(window.AudioContext || window.webkitAudioContext)();
    }

    if (!echoEnabled) {
        if (!mediaStreamSource) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
        }

        // Créer et configurer l'écho avec rétroaction
        echoNode = audioContext.createDelay();
        echoNode.delayTime.value = 0.5; // Ajustez la valeur pour l'effet d'écho

        feedbackNode = audioContext.createGain();
        feedbackNode.gain.value = 0.5; // Ajustez la valeur pour la rétroaction

        // Connecter les nœuds pour créer un effet d'écho répétitif
        mediaStreamSource.connect(echoNode);
        echoNode.connect(feedbackNode);
        feedbackNode.connect(echoNode);
        feedbackNode.connect(audioContext.destination);

        echoToggleButton.textContent = 'Echo on';
        echoToggleButton.style.backgroundColor = 'green';
    } else {
        // Désactiver l'écho
        mediaStreamSource.disconnect(echoNode);
        echoNode.disconnect(feedbackNode);
        feedbackNode.disconnect(audioContext.destination);
        echoNode = null;
        feedbackNode = null;

        echoToggleButton.textContent = 'Echo off';
        echoToggleButton.style.backgroundColor = '#6b6b6b';
    }

    echoEnabled = !echoEnabled;
});