window.onload = function() {
    training_filepath = "";
    if (location.pathname == "/regression/train" || 
        location.pathname == "/regression/evaluate" || 
        location.pathname == "/regression/retrain") {
        setupTrainingOptionsListerners();
        showOrHideConstValueField();
        highlightSelectedExperiment();
    }
}

function setupTrainingOptionsListerners() {
    var trainingSplitSlider = document.getElementById("trn-split");
    if (trainingSplitSlider) {
        trainingSplitSlider.addEventListener('input', handleTrainingSplitInputChange, false);
    }

    function handleTrainingSplitInputChange(e) {
        var pct = trainingSplitSlider.value * 100;
        var displayTrainingSplit = document.getElementById("trn-pct-display");
        displayTrainingSplit.value = `${pct}%`
        e.preventDefault();
    }
}

function highlightSelectedExperiment() {
    selIdEl = document.getElementById("selected-experiment-id");
    if (!selIdEl || !selIdEl.value) { return; }
    selExpBtn = document.getElementById(`exp-${selIdEl.value}`);
    selExpBtn.classList.add('selected-experiment')
}

function dropHandler(ev, desc) {
    endDragOver(desc);
    console.log(`File(s) dropped (${desc} mode)`);
  
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
    file = getDroppedFile();
    saveDataFile(file, desc);
    
    function getDroppedFile() {
        if (ev.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            for (var i = 0; i < ev.dataTransfer.items.length; i++) {
                // If dropped items aren't files, reject them
                if (ev.dataTransfer.items[i].kind === 'file') {
                    var file = ev.dataTransfer.items[i].getAsFile();
                    return file;                
                } 
            }
        } else {
            // Use DataTransfer interface to access the file(s)
            for (var i = 0; i < ev.dataTransfer.files.length; i++) {
                var file = ev.dataTransfer.files[i];
                return file;  
            }
        }
    }
}

function dragOverHandler(ev, desc) {
    document.getElementById(`drop-zone-${desc}`).classList.add('dragging');
    // Prevent default behavior (Prevent file from being opened in browser)
    ev.preventDefault();
}

function endDragOver(desc) {
    document.getElementById(`drop-zone-${desc}`).classList.remove('dragging');
}

function saveDataFile(file, desc) {

    console.log(file.name);
    document.getElementById(`file-display-${desc}`).value = file.name;  // need to set value for later lookup
    document.getElementById(`file-display-${desc}`).innerHTML = file.name;
      
    var formData = new FormData();
    form_label = desc;
    if (desc == 'train' || desc == 'apply') {
        form_label = 'data';
    }
    formData.append(form_label, file);
    var oReq = new XMLHttpRequest();
    oReq.responseType = 'json';
    var uri = "/api/add_session_data";
    
    // add session ref as query param if already set
    refEl = document.getElementById("session-ref-apply")
    if (desc != 'train' && refEl) {
        //console.log("Got session ref elemeent");
        ref = refEl.value;
        if (ref) {
            uri = `${uri}?session_ref=${ref}`;
            console.log(`URI set to: ${uri}`);
        }
    } else if (desc == 'train') {
        uri = `${uri}?return_headers=${true}`;
    }

    oReq.open("POST", uri, true);

    if (desc == 'train') {
        //console.log("adding training onload func...");
        oReq.onload = function(e) {
            //console.log("handling training onload func");
            // handle failure, progress etc later
    
            //document.getElementById("csv-path").value = this.response['filepath']
            document.getElementById("session-ref").value = this.response['session_ref']
    
            heads = this.response['headers']
            var resultColSelect = document.getElementById("result-column");
            //resultColSelect.options = heads;
            for(i in heads) {
                resultColSelect.options[resultColSelect.options.length] = new Option(heads[i], heads[i]);
            }
            resultColSelect.value = heads[i]  // default to last col for now
        }
    } else {        
        //console.log("adding apply onload func...");
        oReq.onload = function(e) {
            console.log("handling apply onload func");
            console.log(this.response);
            document.getElementById("session-ref-apply").value = this.response['session_ref'];
        }
    }
    //console.log("sending request to save file...");
    oReq.send(formData);
}

function showProgress() {
    document.getElementById('progress').style.visibility = 'visible';
}

function showOrHideConstValueField() {
    var option = document.getElementById("null-replacement").value;
    var fillValueEl = document.getElementById("fill-value");
    //console.log(`option set to: ${option}`)
    if (option == "constant") {
        fillValueEl.style.visibility = "visible";
        fillValueEl.required = true;
    } else {
        fillValueEl.style.visibility = "hidden";
        fillValueEl.required = false;
    }
}

function selectExperiment(id) {
    el = document.getElementById("selected-experiment-id")
    if (el.value == id) {
        deselectExperiment()
    } else {
        el.value = id;
        document.args_form.submit();
        console.log(`selected-experiment-id set to: ${document.getElementById("selected-experiment-id").value}`);
    }
}

function deselectExperiment() {
    el = document.getElementById("selected-experiment-id")
    id = el.value;
    el.value = null;
    expEl = document.getElementById(`exp-${id}`);
    if (expEl) {
        expEl.classList.remove('selected-experiment');
        expEl.blur();  // remove focus from element        
    }
}

function saveModel(model_type) {
    url = `/api/${model_type}/download`;
    session_ref = document.getElementById('session-ref').value
    exp_id = document.getElementById('selected-experiment-id').value
    params = `session_ref=${session_ref}`
    if (exp_id) {
        params += `&selected_experiment_id=${exp_id}`
    }

    var oReq = new XMLHttpRequest();
    oReq.responseType = 'blob';
    oReq.open("GET", url+"?"+params, true);

    oReq.onload = function(e) {
        if (oReq.status == 200) {
            handleFileTransSuccess(this.response);
        } else {
            handleFileTransFailure(this.response);
        }

        function handleFileTransSuccess(response) {
            console.log('Handling success response...');
            var blob = response;
            var contentDispo = e.currentTarget.getResponseHeader('Content-Disposition');
            var filename = contentDispo.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)[1];
            console.log(`calling saveBlob for ${filename}`)
            saveBlob(blob, filename);
        }

        function handleFileTransFailure(response) {
            console.log('Something went wrong...');  // handle UI for err etc later
            console.log(response)
        }
    }
    oReq.send();  
}

function reTrainModel() {
    if (!document.getElementById("file-display-model").value
        || !document.getElementById("file-display-apply").value) {
        alert("A data file and model must be uploaded first")
    } else {
        ref = document.getElementById("session-ref-apply").value
        location.assign(`/regression/retrain?session_ref=${ref}`);
    }
}

function saveBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    a.dispatchEvent(new MouseEvent('click'));
}
