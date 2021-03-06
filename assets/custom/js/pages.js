'use strict';

const RAW_SERVER_URL = "https://intern.tec.or.id/restsvc";
const SERVER_URL = RAW_SERVER_URL + "/public";

/**
 * TODO make sure the following scenario works:
 *  - The user is offline
 *  - The user adds Memories for non-supported Relation
 *  - The user goes online and the app sync
 *  - The app should discard the unsupported Memories.
 */

/**
 * Global definitions
 */
myApp.relations = {};
myApp.memories = {};
myApp.syncQueue = [];
myApp.crossParams = {};

/**
 * UUID v4 generator
 * @returns {string} UUID
 */
myApp.uuidv4 = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Parse query string
 * @param queryString
 */
myApp.parseQuery = function (queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
};

/**
 * Appends request to modify
 * @param request
 * @returns {Promise<void>}
 */
myApp.appendSyncRequest = async function(request) {
    // Appends a Request-to-Modify
    let timestamp = Math.round((new Date()).getTime() / 1000);
    request['timestamp'] = timestamp;
    myApp.syncQueue.push(request);
    console.log(myApp.syncQueue);

    // Adds to array
    await localforage.setItem('syncs', (myApp.syncQueue)).then(function (value) {
        console.log("Sync request appended.");
    }).catch(function (err) {
        console.log(err);
    });
};

/**
 * Syncs data
 * This method works by submitting any Request-to-Modify records
 * before fetching the latest Relations list
 * @returns {Promise<void>}
 */
myApp.syncData = async function() {
    let token = await localforage.getItem("token");

    await myApp.loadRelations();

    // Submit request to modify
    var rtms = 0;
    let length = myApp.syncQueue.length;
    console.log("Submitting request-to-modify... Length: " + myApp.syncQueue.length);
    for(let i = 0; i < length; i++) {
        rtms++;
        let rtm = myApp.syncQueue[0];
        $.ajax({
            url: SERVER_URL+"/api/relations/sync",
            method: 'POST',
            cache: false,
            async: false,
            data:{'records': JSON.stringify([rtm])},
            headers: {'Authorization': 'Bearer ' + token},
            error: function(status, xhr) {
                console.log("RTM submit failed");
                console.log(status);
            },
            success: function(data, status, xhr) {
                console.log("RTM submit success.");
                myApp.syncQueue.shift();	// Remove first element
            }
        });
    }

    // Saves array
    if(rtms > 0) {
        await localforage.setItem('syncs', (myApp.syncQueue)).then(function (value) {
            console.log("Sync request saved.");
        }).catch(function (err) {
            console.log(err);
        });
    }

    // Submit Memories modifications
    var edms = 0;
    for(let key in myApp.memories) {
        var memories = myApp.memories[key];
        if(!memories.synced) {
            // Memories isn't synced. Try to sync
            let formData = new FormData();
            formData.append("text", memories.text);

            // Retrieve blob
            let obj = await localforage.getItem("blob-" + memories.blobId);

            if(obj.blob instanceof Blob)
                formData.append("img", obj.blob, obj.fname);

            $.ajax({
                url: SERVER_URL + "/api/memories/put/" + memories.rid,
                method: 'POST',
                cache: false,
                async: true,
                processData: false,
                contentType: false,
                headers: {'Authorization': 'Bearer ' + token},
                data: formData,
                error: function (status, xhr) {
                    console.log("Memories sync failed");
                },
                success: function (msg, status, xhr) {
                    edms++;
                    myApp.memories[key].synced = true;
                }
            });
        }
    }

    // Saves array
    if(edms > 0) {
        await localforage.setItem('memories', (myApp.memories)).then(function (value) {
            console.log("Memories");
        }).catch(function (err) {
            console.log(err);
        });
    }

    // Load relations
    console.log("Retrieving list of Relations...");
    $.ajax({
        url: SERVER_URL+"/api/relations/get",
        method: 'GET',
        cache: false,
        async: true,
        headers: {'Authorization': 'Bearer ' + token},
        error: function(status, xhr) {
            console.log("Get relations failed");
            console.log(status);
        },
        success: function(data, status, xhr) {
            console.log("Relations list retrieved.");
            myApp.parseRelations(data).then(function(relations) {
                localforage.setItem('relasi', (relations));

                // Update last sync
                let timestamp = Math.round((new Date()).getTime() / 1000);
                localforage.setItem("lastsync", timestamp);
                $("#last-sync").text(moment.unix(timestamp).fromNow());
            });
        }
    });
};

/**
 * Parses array of relations
 * @param arr
 * @returns {Promise<void>}
 */
myApp.parseRelations = async function(arr) {
    let relations = {};
    for(let i=0; i < arr.length; i++) {
        let card = vCard.parse(arr[i].vcard);
        card.relationId = arr[i].relation_with;
        relations[card.relationId] = card;
    }

    return relations;
};

/**
 * Adds relations
 * @param card
 */
myApp.addRelation = async function(card) {
    let uid = card.uid[0].value;

    // If UID is undefined, assign new one.
    if(uid === undefined) {
        uid = myApp.uuidv4();
        card.uid[0].value = uid;
    }

    let relationId = uid;

    // Appends a Request-to-Append
    await myApp.appendSyncRequest({'action' : 'A', 'relation_uid' : uid, 'vcard_payload' : vCard.generate(card), 'full_name' : card.fn[0].value});

    // Add relationId to card
    if(relationId !== undefined) {
        card.relationId = relationId;
        myApp.relations[relationId] = card;

        // Adds to array
        await localforage.setItem('relasi', (myApp.relations)).then(function (value) {
            console.log("Relations added!");
        }).catch(function (err) {
            console.log(err);
        });

        // Attempts to sync data
        myApp.syncData();

        return card;
    }
};

/**
 * Deletes relation
 * @param uid UID
 * @returns {Promise<void>}
 */
myApp.deleteRelation = async function(relationId) {
    delete myApp.relations[relationId];

    // Removes from array
    await localforage.setItem('relasi', /*JSON.stringify*/(myApp.relations)).then(function(value) {
        myApp.relations = value;
    }).catch(function(err) {
        console.log(err);
    });

    // Appends a Request-to-Remove
    await myApp.appendSyncRequest({'action' : 'D', 'relation_uid' : relationId});


    // Attempts to sync data
    myApp.syncData();
};

/**
 * Load Relations from localForage
 * @returns {Promise<void>}
 */
myApp.loadRelations = async function() {
    /* Load Relations */
    await localforage.getItem("relasi").then(function(readValue) {
        if(readValue == undefined) {
            myApp.relations = {};
        } else {
            myApp.relations = /*JSON.parse*/(readValue);
        }
    });

    /* Load Sync requests */
    await localforage.getItem("syncs").then(function(readValue) {
        if(readValue == undefined) {
            myApp.syncQueue = [];
        } else {
            myApp.syncQueue = /*JSON.parse*/(readValue);
        }
    });

    /* Load Memories */
    await localforage.getItem("memories").then(function(readValue) {
        if(readValue == undefined) {
            myApp.memories = [];
        } else {
            myApp.memories = /*JSON.parse*/(readValue);
        }
    });
};

/**
 * Sets memories
 * @param memories
 */
myApp.setMemories = async function(memories) {
    myApp.memories[memories.rid] = memories;

    // Adds to array
    await localforage.setItem('memories', (myApp.memories)).then(function(value) {
        console.log("Memories set!");
    }).catch(function (err) {
        console.log(err);
    });
};

myApp.isRelated = function(uid) {
    for (let key in myApp.relations) {
        let value = myApp.relations[key];
        if(value.uid[0].value == uid) return true;
    }

    return false;
};

/**
 * Clears storage
 * @returns {Promise<void>}
 */
myApp.clearStorage = async function() {
    await localforage.removeItem("relasi");
    await localforage.removeItem("syncs");
    await localforage.removeItem("token");
    await localforage.removeItem("uid");
    await localforage.removeItem("profile");
    await localforage.removeItem("dac");
    /*await localforage.removeItem("name");
    await localforage.removeItem("nickname");
    await localforage.removeItem("tec_regno");*/
};



/*
|------------------------------------------------------------------------------
| Default pages
|------------------------------------------------------------------------------
*/

myApp.onPageInit('*', function(page) {
    $('img[data-failover]').error(function(){
        var failover = $(this).data('failover');
        if (this.src != failover){
            this.src = failover;
        }
    });
});

myApp.onPageBeforeAnimation('*', function(page) {
    if(page.name !== "login") {
        // Check if user is logged in
        localforage.getItem("token").then(function (readValue) {
            if (readValue == null) {
                window.location.href = "#!/";
                window.location.reload();
            }
        });

        // Display profile to UI
        localforage.getItem("profile").then(function (profile) {
            if(profile !== null) {
                myApp.userProfile = profile;
                myApp.injectProfileData(profile);
            }
        });
    }
});

myApp.injectProfileData = function(profile) {
    $(".profile-info").each(function(i) {
        var profileType = $(this).attr("data-profile");
        var injectType = $(this).attr("data-inject");

        switch (injectType) {
            case 'html':
                $(this).html(profile[profileType]);
                break;
            case 'src':
                $(this).attr("src", profile[profileType]);
                break;
            case 'text':
            default:
                $(this).text(profile[profileType]);
                break;
        }
    });
};

/*
|------------------------------------------------------------------------------
| Relasi
|------------------------------------------------------------------------------
*/

myApp.onPageInit('relasi', function(page) {
    myApp.loadRelations().then(function() {
        initialize();
    });

    function initialize() {
        var relationsAlphabetic = [];
        var addedLetters = [];

        for (var key in myApp.relations) {
            var value = myApp.relations[key];
            relationsAlphabetic.push(value);
        }

        function compare(a,b) {
            if (a.fn[0].value < b.fn[0].value)
                return -1;
            if (a.fn[0].value > b.fn[0].value)
                return 1;
            return 0;
        }

        relationsAlphabetic.sort(compare);

        var content = '';
        for(var i=0; i < relationsAlphabetic.length; i++) {
            var card = relationsAlphabetic[i];
            var firstLetter = card.fn[0].value.charAt(0).toUpperCase();

            if(!addedLetters.includes(firstLetter)) {
                addedLetters.push(firstLetter);
                // New letters

                // If not the first element, add a tag closing.
                if(i > 0) content += '</ul></div>';
                content += '<div class="list-group"><ul><li class="list-group-title">' + firstLetter + '</li>';
            }

            // Append content
            var imgurl = "assets/custom/img/avatar.png";
            if(card.photo !== undefined) imgurl = card.photo[0].value;

            content += '<li class="swipeout" data-uid="' + card.uid[0].value + '">\n' +
                '\t\t\t\t\t\t<div class="item-content swipeout-content" data-action="view-contact">\n' +
                '\t\t\t\t\t\t\t<div class="item-media">\n' +
                '\t\t\t\t\t\t\t\t<div class="img-relation"><img src="' + imgurl + '" data-failover="assets/custom/img/avatar.png" width="100%" alt="" /></div>\n' +
                '\t\t\t\t\t\t\t</div>\n' +
                '\t\t\t\t\t\t\t<div class="item-inner">\n' +
                '\t\t\t\t\t\t\t\t<div class="item-title">' + card.fn[0].value + '</div>\n' +
                '\t\t\t\t\t\t\t</div>\n' +
                '\t\t\t\t\t\t</div>\n' +
                '\t\t\t\t\t\t<div class="swipeout-actions swipeout-actions-left">\n' +
                '\t\t\t\t\t\t\t<a href="tel:' + card.fn[0].value + '" class="external swipeout-action bg-blue">\n' +
                '\t\t\t\t\t\t\t\t<i class="swipeout-action-icon fa fa-phone"></i>\n' +
                '\t\t\t\t\t\t\t\t<span class="swipeout-action-label">Call</span>\n' +
                '\t\t\t\t\t\t\t</a>\n';

            if(card['X-LINE'] != undefined) {
                content += '\t\t\t\t\t\t\t<a href="line://ti/p/' + card['X-LINE'][0].value + '" class="external swipeout-action bg-green">\n' +
                    '\t\t\t\t\t\t\t\t<i class="swipeout-action-icon fa fa-comment-o"></i>\n' +
                    '\t\t\t\t\t\t\t\t<span class="swipeout-action-label">LINE</span>\n' +
                    '\t\t\t\t\t\t\t</a>\n';
            }

            content += '\t\t\t\t\t\t</div>\n' +
                '\t\t\t\t\t\t<div class="swipeout-actions swipeout-actions-right">\n' +
                '\t\t\t\t\t\t\t<a href="#" class="swipeout-action bg-red" data-action="delete-contact">\n' +
                '\t\t\t\t\t\t\t\t<i class="swipeout-action-icon fa fa-trash-o"></i>\n' +
                '\t\t\t\t\t\t\t\t<span class="swipeout-action-label">Remove</span>\n' +
                '\t\t\t\t\t\t\t</a>\n' +
                '\t\t\t\t\t\t</div>\n' +
                '\t\t\t\t\t</li>';
        }

        // If relations is more than zero, add closing tag
        if(relationsAlphabetic.length > 0) content += '</ul></div>';

        $("#relasi-list").html(content);

        $('img[data-failover]').error(function(){
            var failover = $(this).data('failover');
            if (this.src != failover){
                this.src = failover;
            }
        });

        /* Search Bar */
        var mySearchbar = myApp.searchbar('.page[data-page=relasi] .searchbar', {
            searchList: '.page[data-page=relasi] .list-block-search',
            searchIn: '.page[data-page=relasi] .item-title'
        });

        /* View Contact */
        $$('.page[data-page=relasi] [data-action=view-contact]').on('click', function(e) {
            e.preventDefault();
            var el = $(this).closest('.swipeout');
            var id = $(el).attr("data-uid");

            if(myApp.relations[id] != undefined) {
                myApp.crossParams['relasi-details'] = {};
                myApp.crossParams['relasi-details']['id'] = id;

                mainView.router.load({
                    url: 'relasi_details.html',
                    pushState: true
                });
            } else
                alert("This entry is either removed or does not exist");
        });

        /* Delete Contact */
        $$('.page[data-page=relasi] [data-action=delete-contact]').on('click', function(e) {
            e.preventDefault();
            var el = $(this).closest('.swipeout');
            myApp.confirm('Are you sure to remove this from My Relations?',
                function() {
                    myApp.deleteRelation($(el).attr("data-uid")).then(function() {
                        myApp.swipeoutDelete(el, function(){
                            myApp.addNotification({
                                message: 'Removed from My Relations',
                                hold: 1500,
                                button: {
                                    text: ''
                                }
                            });
                        });
                    });
                }
            );
            myApp.swipeoutClose(el);
        });

        $("#btn-relation-dac").on('click', function() {
            myApp.popup(".popup-relation-dac");
        });

        $("#btn-dac-submit").on('click', function() {
            lookupDac();
        });
    }

    function lookupDac() {
        localforage.getItem("token").then(function (token) {
            $.ajax({
                url: SERVER_URL+"/api/rda/vcard",
                method: 'GET',
                cache: false,
                async: true,
                data: {dac: $("#dac").val()},
                headers: {'Authorization': 'Bearer ' + token},
                error: function(status, xhr) {
                    console.log(status);
                    alert("Server is unreachable. Please check your internet connection.");
                    $("#dac-loading").fadeOut(0);
                },
                success: function(data, status, xhr) {
                    $("#dac-loading").fadeOut(0);

                    if(data.error !== undefined) {
                        alert(data.error.text);
                    } else {
                        // DAC exists, redirect
                       processVcardData(data.vcard);
                    }
                }
            });
        });
    }

    function processVcardData(data) {
        console.log(data);
        if(data.startsWith("BEGIN:VCARD") && data.replace(/\n$/, "").replace(/\r$/, "").endsWith("END:VCARD")) {
            myApp.closeModal(".popup-relation-dac");
            myApp.crossParams['relasi-details'] = {};
            myApp.crossParams['relasi-details']['vcard'] = encodeURIComponent(data);
            mainView.router.load({
                url: 'relasi_details.html',
                pushState: true
            });
        } else {
            alert("Invalid data");
        }
    }
});

/*
|------------------------------------------------------------------------------
| Relasi Details
|------------------------------------------------------------------------------
*/

myApp.onPageBeforeAnimation('relasi-details', function(page) {
    let param = myApp.crossParams['relasi-details'];
    myApp.loadRelations().then(function() {
        if(param['vcard'] !== undefined) {
            viewRelasi(vCard.parse(decodeURIComponent(param['vcard'])));
        } else if(param['id'] !== undefined) {
            viewRelasi(myApp.relations[param['id']]);
        }
    });

    var openCard;

    function viewRelasi(cd) {
        // It is a vCard
        openCard = cd;

        //$("#r-btn-add-vcf").attr('href', 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vCard.generate(cdtg))); //TODO fix

        $(".r-contact-name").html(cd.fn[0].value);
        $(".r-contact-org").html(cd.org[0].value);
        if(cd.uid != undefined) {
            $(".r-contact-uid").html(cd.uid[0].value);
            $(".r-btn-memories").fadeIn(0);
        } else {
            $(".r-btn-memories").fadeOut(0);
        }

        if(cd.note != undefined)
            $(".r-contact-cat").html(Array.isArray(cd.note[0].value) ? cd.note[0].value.join(", ") : cd.note[0].value);
        else
            $(".r-contact-cat").html("<i>No data</i>");

        if(cd.email != undefined)
            $(".r-contact-email").html(cd.email[0].value).attr("href", "mailto:" + cd.email[0].value);
        else
            $(".r-contact-email").html("<i>No data</i>").removeAttr("href");

        if(cd.tel != undefined)
            $(".r-contact-mobile").html(cd.tel[0].value).attr("href", "tel:" + cd.tel[0].value);
        else
            $(".r-contact-mobile").html("<i>No data</i>").removeAttr("href");

        if(cd.adr != undefined)
            $(".r-contact-address").html(Array.isArray(cd.adr[0].value) ? cd.adr[0].value.join(', ') : cd.adr[0].value);
        else
            $(".r-contact-address").html("<i>No data</i>");

        if(cd['X-LINE'] != undefined)
            $(".r-contact-line").html(cd['X-LINE'][0].value).attr("href", "line://ti/p/~" + cd['X-LINE'][0].value);
        else
            $(".r-contact-line").html("<i>No data</i>").removeAttr("href");

        if(cd['X-INSTAGRAM'] != undefined)
            $(".r-contact-instagram").html(cd['X-INSTAGRAM'][0].value).attr("href", "https://instagram.com/" + cd['X-INSTAGRAM'][0].value.replace('@', ''));
        else
            $(".r-contact-instagram").html("<i>No data</i>").removeAttr("href");

        if(cd.photo !== undefined) {
            $("#relimg").attr("src", cd.photo[0].value);
        }

        setupRelasiButton();
    }

    $(".r-btn-add-relasi").on('click', function() {
        if(!myApp.isRelated(openCard.uid[0].value)) {
            myApp.addRelation(openCard).then(function(card) {
                openCard = card;
                setupRelasiButton();
            });
        } else {
            myApp.confirm('Are you sure to remove this from My Relations?',
                function() {
                    myApp.deleteRelation(openCard.relationId).then(function() {
                        setupRelasiButton();
                    });
                });
        }
    });

    function setupRelasiButton() {
        myApp.crossParams['memories'] = {};
        myApp.crossParams['memories']['rid'] = openCard.uid[0].value;
        myApp.crossParams['memories']['name'] = openCard.fn[0].value;
        $(".r-btn-memories").attr("href", "memories.html");
        if(!myApp.isRelated(openCard.uid[0].value)) {
            $(".r-btn-add-relasi .item-title").html("Add to My Relations");
        } else {
            openCard.relationId = (openCard.uid[0].value);
            $(".r-btn-add-relasi .item-title").html("<span style='color:#f44336'>Remove from My Relations</span>");
        }
    }
});

/*
|------------------------------------------------------------------------------
| Relasi Capture
|------------------------------------------------------------------------------
*/
var scanner;
myApp.onPageInit('relasi-capture', function(page) {
    $("#cameraInput").change(function() {
        handleFiles(this.files);
    });

    var currentCam = 0;
    var cams = [];

    $("#qrscan-error").fadeOut(0);
    setTimeout(function() {
        if(cams.length === 0) {
            $("#qrscan-error").fadeIn(250);
        }
    }, 2000);

    $("#cam-action").on('click', function () {
        if(cams.length === 0) {
            $('#cameraInput').click();
        } else {
            // Switch camera
            scanner.stop();
            currentCam++;
            if(currentCam >= cams.length) {
                currentCam = 0;
            }

            scanner.start(cams[currentCam]);
        }
    });

    // webcam is available
    if (Instascan !== undefined) {
        scanner = new Instascan.Scanner({video: document.getElementById('preview'), backgroundScan: false, mirror: false});
        scanner.addListener('scan', function (content) {
            console.log(content);
            processVcardData(content);
        });
        Instascan.Camera.getCameras().then(function (cameras) {
            if (cameras.length > 0) {
                currentCam = cameras.length - 1;
                cams = cameras;
                scanner.start(cameras[currentCam]);
                $("#qrscan-error").fadeOut(0);
            } else {
                console.error('No cameras found.');
                $("#qrscan-webrtc").fadeOut(0);
            }
        }).catch(function (e) {
            console.error(e);
        });
    }

    $("#qrscan-webrtc").fadeIn(0);

    var card;

    $("#btn-add-relasi").on('click', function() {
        if(!myApp.isRelated(card.uid[0].value)) {
            myApp.addRelation(card).then(function(nCard) {
                card = nCard;
                setupRelasiButton();
            });
        } else {
            card.relationId = (card.uid[0].value);
            myApp.confirm('Are you sure to remove this from My Relations?',
                function() {
                    myApp.deleteRelation(card.relationId).then(function() {
                        setupRelasiButton();
                    });
                });
        }
    });

    /* Load Relations*/
    myApp.loadRelations();

    function handleFiles(f) {
        var o=[];

        for(var i =0;i<f.length;i++)
        {
            var reader = new FileReader();
            reader.onload = (function(theFile) {
                return function(e) {
                    qrcode.decode(e.target.result);
                    qrcode.callback = function(data) {
                        processVcardData(data);
                    }
                };
            })(f[i]);
            reader.readAsDataURL(f[i]);
        }
    }

    function setupRelasiButton() {
        if(!myApp.isRelated(card.uid[0].value)) {
            $("#btn-add-relasi .item-title").html("Add to My Relations");
        } else {
            $("#btn-add-relasi .item-title").html("<span style='color:#f44336'>Remove from My Relations</span>");
        }
    }

    function processVcardData(data) {
        if(data.startsWith("BEGIN:VCARD") && data.replace(/\n$/, "").replace(/\r$/, "").endsWith("END:VCARD")) {
            myApp.crossParams['relasi-details'] = {};
            myApp.crossParams['relasi-details']['vcard'] = encodeURIComponent(data);
            mainView.router.load({
                url: 'relasi_details.html',
                pushState: true
            });
        } else {
            alert("Invalid or unreadable QR code");
        }
    }
});

myApp.onPageBeforeRemove('relasi-capture', function(page) {
    scanner.stop();
});


/*
|------------------------------------------------------------------------------
| Memories
|------------------------------------------------------------------------------
*/

myApp.onPageInit('memories', function(page) {
    let tecRegNo = myApp.crossParams['memories']['rid'];
    let imgBlob;
    let imgName;
    let previewOpened = false;

    var loadFile = function(event) {
        downscale(event.target.files[0], 0, 500, {returnBlob : 1}).then(function(blob) {
            // Append image to form as a blob data
            imgBlob = blob;
            imgName = event.target.files[0].name;

            // Preview image
            let dataURL = URL.createObjectURL(blob);

            $("#mimgprev").fadeIn().css("height", "200px"); //.css('background-image', 'url(' + dataURL + ')');
            $("#imgprev").attr("src", dataURL);

            setTimeout(function() {
                URL.revokeObjectURL(dataURL);
            }, 2000);
        });
    };

    $("#mimgprev").on('click', function () {
        if(previewOpened) {
            $(this).css("height", "200px");
            previewOpened = false;
        } else {
            $(this).css("height", "auto");
            previewOpened = true;
        }
    });

    $("#cameraInput").on('change', function(event) {
        loadFile(event);
    });

    $("#impression").on('change keyup paste', function() {
        let content = $(this).val().replace("\n", " ").replace("\r", " ").replace("\t", " ").trim();
        let length = content.split(' ').length;
        if(content === "") length = 0;
        $("#words-indicator").html(length + (length === 1 ? ' word' : ' words'));

        // Update icon
        if(length >= 80) {
            $("#ic-base-text").removeClass("color-gray").removeClass("color-green").addClass("color-green");
            $("#ic-text").removeClass("fa-book-open").removeClass("fa-check").addClass("fa-check");
        } else {
            $("#ic-base-text").removeClass("color-gray").removeClass("color-green").addClass("color-gray");
            $("#ic-text").removeClass("fa-book-open").removeClass("fa-check").addClass("fa-book-open");
        }
    });

    $("#a-impression").on('click', function() {
        writeImpression();
    });

    function writeImpression() {
        myApp.popup('.popup-memories-impression');
    }

    $("#btn-save").on('click', function() {
        localforage.getItem("token").then(function(readValue) {
            if(readValue != null) {
                submit(readValue);
            }
        });
    });

    function submit(token) {
        let formData = new FormData();
        formData.append("text", $("#impression").val());
        if(imgBlob instanceof Blob)
            formData.append("img", imgBlob, imgName);

        $("#loading").fadeIn(0);
        $("#main-memories").fadeOut(0);

        var blobId = tecRegNo;

        $.ajax({
            url: SERVER_URL + "/api/memories/put/" + tecRegNo,
            method: 'POST',
            cache: false,
            async: true,
            processData: false,
            contentType: false,
            headers: {'Authorization': 'Bearer ' + token},
            data: formData,
            error: function (status, xhr) {
                //TODO on error
                $("#loading").fadeOut(0);
                $("#error").fadeIn(0).html("<span class='color-red'>Something went wrong while connecting to the server. Please try again later.</span>");
                $("#main-memories").fadeIn(0);

                myApp.setMemories({rid: tecRegNo, text: $("#impression").val(), synced: false, name: myApp.crossParams['memories']['name'], blobId: blobId});

                if(imgBlob instanceof Blob)
                    localforage.setItem("blob-" + blobId, {blob: imgBlob, fname: imgName});
            },
            success: function (msg, status, xhr) {
                console.log("done E= " + msg);
                $("#loading").fadeOut(0);
                $("#error").fadeIn(0).html("<span class='color-green'>Memories saved.</span>");
                $("#main-memories").fadeIn(0);

                myApp.setMemories({rid: tecRegNo, text: $("#impression").val(), synced: true, name: myApp.crossParams['memories']['name'], blobId: blobId});
                if(imgBlob instanceof Blob)
                    localforage.setItem("blob-" + blobId, {blob: imgBlob, fname: imgName});
            }
        });
    }
});

myApp.onPageBeforeAnimation('memories', function(page) {
    // Attempt to load userinfo
    let tecRegNo = myApp.crossParams['memories']['rid'];

    localforage.getItem("token").then(function(readValue) {
        if(readValue != null) {
            loadUser(tecRegNo, readValue);
        }
    });

    function loadUser(regNo, token) {
        $("#main-memories").fadeOut(0);
        $("#error").fadeOut(0);
        $("#loading").fadeIn(0);
        $.ajax({
            url: SERVER_URL + "/api/memories/get/" + tecRegNo,
            method: 'GET',
            cache: false,
            async: true,
            headers: {'Authorization': 'Bearer ' + token},
            error: function (status, xhr) {
                //TODO on error
                $("#loading").fadeOut(0);
                if(myApp.memories[tecRegNo] !== undefined && myApp.memories[tecRegNo] === false) {
                    $("#error").fadeIn(0).html("This Relation is not supported for Memories.");
                } else {
                    $("#main-memories").fadeIn(0);
                    $("#loading").fadeOut(0);

                    $(".span-name").html(myApp.crossParams['memories']['name']);

                    if(myApp.memories[tecRegNo] !== undefined)
                        $("#impression").val(myApp.memories[tecRegNo].text).change();

                    let content = myApp.memories[tecRegNo].text.replace("\n", " ").replace("\r", " ").replace("\t", " ").trim();
                    let length = content.split(' ').length;
                    if(content === "") length = 0;

                    // Update icon
                    if(length >= 80) {
                        $("#ic-base-text").removeClass("color-gray").removeClass("color-green").addClass("color-green");
                        $("#ic-text").removeClass("fa-book-open").removeClass("fa-check").addClass("fa-check");
                    } else {
                        $("#ic-base-text").removeClass("color-gray").removeClass("color-green").addClass("color-gray");
                        $("#ic-text").removeClass("fa-book-open").removeClass("fa-check").addClass("fa-book-open");
                    }

                    // Load and check image
                    if(myApp.memories[tecRegNo] !== undefined && myApp.memories[tecRegNo].blobId !== undefined) {
                        // Get blobId
                        let blobId = myApp.memories[tecRegNo].blobId;

                        // Retrieve blob
                        localforage.getItem("blob-" + blobId).then(function(obj) {
                            if(obj.blob instanceof Blob) {
                                let dataURL = URL.createObjectURL(obj.blob);
                                $("#mimgprev").fadeIn();
                                $("#imgprev").attr("src", dataURL);

                                setTimeout(function() {
                                    URL.revokeObjectURL(dataURL);
                                }, 2000);
                            }
                        });

                        $("#ic-base-img").removeClass("color-gray").removeClass("color-green").addClass("color-green");
                        $("#ic-img").removeClass("fa-camera").removeClass("fa-check").addClass("fa-check");
                    } else {
                        $("#mimgprev").fadeOut(0);
                        $("#ic-base-img").removeClass("color-gray").removeClass("color-green").addClass("color-gray");
                        $("#ic-img").removeClass("fa-camera").removeClass("fa-check").addClass("fa-camera");
                    }
                }
            },
            success: function (msg, status, xhr) {
                console.log("done E= " + msg);
                if (msg.error !== undefined) {
                    console.log("Error");
                    //TODO user not exists
                    $("#loading").fadeOut(0);
                    $("#error").fadeIn(0).html("This Relation is not supported for Memories.");
                } else {
                    $("#main-memories").fadeIn(0);
                    $("#loading").fadeOut(0);
                    $(".span-name").html(msg.user.name);

                    if(msg.memories !== false) {
                        // Check and load Text content
                        var e = jQuery.Event("keydown");
                        e.which = 50; // # Some key code value
                        e.keyCode = 50

                        $("#impression").val(msg.memories.text).change().trigger(e);

                        let content = msg.memories.text.replace("\n", " ").replace("\r", " ").replace("\t", " ").trim();
                        let length = content.split(' ').length;
                        if(content === "") length = 0;

                        // Update icon
                        if(length >= 80) {
                            $("#ic-base-text").removeClass("color-gray").removeClass("color-green").addClass("color-green");
                            $("#ic-text").removeClass("fa-book-open").removeClass("fa-check").addClass("fa-check");
                        } else {
                            $("#ic-base-text").removeClass("color-gray").removeClass("color-green").addClass("color-gray");
                            $("#ic-text").removeClass("fa-book-open").removeClass("fa-check").addClass("fa-book-open");
                        }

                        // Load and check image
                        if(msg.memories.img_path != "") {
                            $("#mimgprev").fadeIn();
                            $("#imgprev").attr("src", msg.memories.img_path.replace("memories://", RAW_SERVER_URL + "/uploads/memories/"));

                            $("#ic-base-img").removeClass("color-gray").removeClass("color-green").addClass("color-green");
                            $("#ic-img").removeClass("fa-camera").removeClass("fa-check").addClass("fa-check");
                        } else {
                            $("#mimgprev").fadeOut(0);
                            $("#ic-base-img").removeClass("color-gray").removeClass("color-green").addClass("color-gray");
                            $("#ic-img").removeClass("fa-camera").removeClass("fa-check").addClass("fa-camera");
                        }
                    }
                }
            }
        });
    }
});

/*
|------------------------------------------------------------------------------
| Home
|------------------------------------------------------------------------------
*/

myApp.onPageInit('home', function(page) {

    // Remove history
    //mainView.history = [];

    $$('.action-logout').on('click', function() {
        myApp.confirm('Are you sure to logout?',
            function() {
                logout();
            }
        );
    });


    /*Logout, delete token*/
    function logout(){
        console.log("logging out...");
        myApp.clearStorage().then(function() {
           console.log("logged out.");
            mainView.router.load({
                url: 'login.html',
                pushState: false
            });
            mainView.history = [];
        });
    }
});

myApp.onPageBeforeAnimation('home', function(page) {
    // Display last synced
    localforage.getItem("lastsync").then(function(timestamp) {
        $("#last-sync").text(moment.unix(timestamp).fromNow());
    }).catch(function(err) {
        $("#last-sync").text("Never");
    });
});

/*
|------------------------------------------------------------------------------
| Log In
|------------------------------------------------------------------------------
*/

myApp.onPageInit('login', function(page) {

    /* Show|Hide Password */
    $$('.page[data-page=login] [data-action=show-hide-password]').on('click', function() {
        if ($$('.page[data-page=login] input[data-toggle=show-hide-password]').attr('type') === 'password') {
            $$('.page[data-page=login] input[data-toggle=show-hide-password]').attr('type', 'text');
            $$(this).attr('title', 'Hide');
            $$(this).children('i').text('visibility_off');
        }
        else {
            $$('.page[data-page=login] input[data-toggle=show-hide-password]').attr('type', 'password');
            $$(this).attr('title', 'Show');
            $$(this).children('i').text('visibility');
        }
    });

    /* Validate & Submit Form */
    $('.page[data-page=login] form[name=login]').validate({
        rules: {
            email: {
                required: true,
                email:true
            },
            password: {
                required: true
            }
        },
        messages: {
            email: {
                required: 'Please enter email address.',
                email: 'Please enter a valid email address.'
            },
            password: {
                required: 'Please enter password.'
            }
        },
        onkeyup: false,
        errorElement : 'div',
        errorPlacement: function(error, element) {
            error.appendTo(element.parent().siblings('.input-error'));
        },
        submitHandler: function(form) {
            login(form.email, form.password, function(status, message) {
                if(status === true) {
                    mainView.router.load({
                        url: 'home.html',
                        pushState: true
                    });
                } else {
                    myApp.addNotification({
                        message: message,
                        hold: 1500,
                        button: {
                            text: ''
                        }
                    });
                }
                return false;
            });
        }
    });

    var jwt, uid;

    /*Login*/
    // This variable is used to keep track if a server call is ongoing.
    var isLoggingIn = false;

    function login(email, passwd, callback) {
        if(!isLoggingIn) {
            isLoggingIn = true;
            console.log("loggingin");

            $.ajax({
                url: SERVER_URL + "/api/login",
                data: {email: $("#emailLogin").val(), password: $("#passwordLogin").val()},
                method: 'POST',
                cache: false,
                async: true,
                error: function(status, xhr) {
                    isLoggingIn = false;
                    callback(false, "Login failed, please try again");
                },
                success: function(msg, status, xhr) {
                    isLoggingIn = false;
                    console.log("done E= " + msg);
                    if (typeof msg.error !== "undefined") {
                        console.log("Error");
                        callback(false, msg.message);
                    } else {
                        localforage.setItem('token', msg.token).then(function(value) {
                            jwt = value;
                        }).then(function() {
                            localforage.setItem('uid', msg.id).then(function(value) {
                                uid = value;
                            }).then(function() {
                                getProfile(msg.id, msg.token);
                                getRelations(msg.token);
                                callback(true, "");
                            }).catch(function(err) {
                                console.log(err);
                            });
                        }).catch(function(err) {
                            console.log(err);
                        });
                    }
                }
            });
        }
    }

    function getProfile(uid, token) {
        $.ajax({
            url: SERVER_URL+"/api/user/"+uid,
            method: 'GET',
            cache: false,
            async: true,
            headers: {'Authorization': 'Bearer ' + token},
            error: function(status, xhr) {
                console.log("Get profile failed");
                console.log(status);
            },
            success: function(msg, status, xhr) {
                myApp.injectProfileData(msg);

                localforage.setItem('profile', msg).then(function(profile) {
                    myApp.userProfile = profile;
                }).catch(function(err) {
                    console.log(err);
                });
            }
        });
    }

    function getRelations(token) {
        console.log("Retrieving list of Relations...");
        $.ajax({
            url: SERVER_URL+"/api/relations/get",
            method: 'GET',
            cache: false,
            async: true,
            headers: {'Authorization': 'Bearer ' + token},
            error: function(status, xhr) {
                console.log("Get relations failed");
                console.log(status);
            },
            success: function(data, status, xhr) {
                console.log("Relations list retrieved.");
                myApp.parseRelations(data).then(function(relations) {
                    localforage.setItem('relasi', /*JSON.stringify*/(relations)).then(function(value) {
                        console.log("Relations added");
                    }).catch(function(err) {
                        console.log(err);
                    });
                }).catch(function(err) {
                    console.log(err);
                });
            }
        });
    }
});

/*
|------------------------------------------------------------------------------
| Splash Screen
|------------------------------------------------------------------------------
*/

myApp.onPageInit('splash-screen', function(page) {

    /*new Vivus('logo', {
        duration: 125,
        onReady: function(obj) {
            obj.el.classList.add('animation-begin');
        }
    },
    function(obj) {
        obj.el.classList.add('animation-finish');

        setTimeout(function(){
            mainView.router.load({
                url: 'walkthrough.html'
            });
        }, 3000);
    });*/

    localforage.getItem("token").then(function(readValue) {
        if(readValue == null) {
            mainView.router.load({
                url: 'login.html',
                pushState: false
            });
            mainView.history = [];
        } else {
            mainView.router.load({
                url: 'home.html',
                pushState: true
            });
            mainView.history = [];
        }
    });

    /*setTimeout(function(){
        mainView.router.load({
            url: 'home.html',
            pushState: true
        });
        mainView.history = [];
    }, 200);*/

    $$('.page[data-page=splash-screen] .splash-preloader').css('opacity', 1);

});

/*
|------------------------------------------------------------------------------
| User Profile
|------------------------------------------------------------------------------
*/

myApp.onPageInit('user-profile', function(page) {
    var qrcode;

    if(typeof QRCode !== 'undefined')
        qrcode = new QRCode(document.getElementById("profile-qrc"), "tec internapp");

    $("#btn-qrc").on('click', function() {
        myApp.popup(".popup-profile");
        $("#profile-qrc-loading").fadeIn(0);
        $("#profile-qrc-card").fadeOut(0);
        if(myApp.profile_qrcode !== undefined) myApp.profile_qrcode.clear();


        if(qrcode === undefined)
            qrcode = new QRCode(document.getElementById("profile-qrc"), "tec internapp");

        localforage.getItem("token").then(function (token) {
            $.ajax({
                url: SERVER_URL+"/api/relations/vcard",
                method: 'GET',
                cache: false,
                async: true,
                headers: {'Authorization': 'Bearer ' + token},
                error: function(status, xhr) {
                    console.log(status);
                },
                success: function(data, status, xhr) {
                    $("#profile-qrc-loading").fadeOut(0);
                    $("#profile-qrc-card").fadeIn(0);
                    qrcode.clear();
                    qrcode.makeCode(data.vcard);
                }
            });
        });
    });

    $("#btn-dac").on('click', function() {
        myApp.popup(".popup-dac");
        $("#profile-dac-loading").fadeIn(0);
        $(".profile-dac-card").fadeOut(0);
        $("#profile-dac-help-notgenrt").hide();

        // Check if DAC is stored
        localforage.getItem("dac").then(function(data) {
            if(data !== null) {
                // DAC is stored, display to screen
                $("#profile-dac-loading").fadeOut(0);
                $(".profile-dac-card").fadeIn(0);

                //TODO display
                $("#dacode").text(data.dac);
                $("#last-used").text((data.last_used === 0 || data.last_used == null) ? 'Never' : moment.unix(data.last_used).fromNow());
                $("#last-used-by").text(data.last_used_by_name == null ? 'Never' : data.last_used_by_name);
                $("#times-used").text(data.used + " " + ((data.used === 1) ? "time" : "times"));
            } else {
                refreshDac();
            }
        });
    });

    $("#btn-dac-refresh").on('click', function() {
        refreshDac();
    });

    $(".btn-dac-generate").on('click', function() {
        generateDac();
    });

    function refreshDac() {
        $("#profile-dac-loading").fadeIn(0);
        $(".profile-dac-card").fadeOut(0);
        $("#profile-dac-help-notgenrt").hide();

        localforage.getItem("token").then(function (token) {
            $.ajax({
                url: SERVER_URL+"/api/rda/dac",
                method: 'GET',
                cache: false,
                async: true,
                headers: {'Authorization': 'Bearer ' + token},
                error: function(status, xhr) {
                    console.log(status);
                    // Server unreachable, display help
                    $("#profile-dac-loading").fadeOut(0);
                    $("#profile-dac-help-notgenrt").show();
                },
                success: function(data, status, xhr) {
                    $("#profile-dac-loading").fadeOut(0);

                    if(data.error !== undefined) {
                        if(data.error.code === 404) {
                            // Code not generated, display help
                            // TODO display help
                            $("#profile-dac-help-notgenrt").show();
                        } else {
                            alert(data.error.text);
                        }
                    } else {
                        // DAC exists, display to screen
                        $(".profile-dac-card").fadeIn(0);

                        $("#dacode").text(data.dac);
                        $("#last-used").text((data.last_used === 0 || data.last_used == null) ? 'Never' : moment.unix(data.last_used).fromNow());
                        $("#last-used-by").text(data.last_used_by_name == null ? 'Never' : data.last_used_by_name);
                        $("#times-used").text(data.used + " " + ((data.used === 1) ? "time" : "times"));

                        // Save to localForage
                        localforage.setItem("dac", data);
                    }
                }
            });
        });
    }

    function generateDac() {
        $("#profile-dac-loading").fadeIn(0);
        $(".profile-dac-card").fadeOut(0);
        $("#profile-dac-help-notgenrt").hide();

        localforage.getItem("token").then(function (token) {
            $.ajax({
                url: SERVER_URL+"/api/rda/dac",
                method: 'POST',
                cache: false,
                async: true,
                headers: {'Authorization': 'Bearer ' + token},
                error: function(status, xhr) {
                    console.log(status);
                    // Server unreachable, display help
                    $("#profile-dac-loading").fadeOut(0);
                    $("#profile-dac-help-notgenrt").show();
                },
                success: function(data, status, xhr) {
                    refreshDac();
                }
            });
        });
    }

    $("#btn-passwd").on('click', function() {
        myApp.popup(".popup-password");
    });

    $("#btn-profpic").on('click', function() {
        myApp.popup(".popup-picture");
    });

    var isChanging = false;

    if(!isChanging) {
        $("#btn-passwd-submit").on('click', function () {
            var opass = $("#opass").val();
            var npass = $("#npass").val();
            var rnpass = $("#rnpass").val();

            // Check 1: npass >= 10 chars
            if (npass.length < 10) {
                alert("Minimum password length is 10 characters.");
                return;
            }

            // Check 2: npass === rnpass
            if (npass !== rnpass) {
                alert("Passwords do not match.");
                return;
            }

            // Attempt to change password
            $("#btn-passwd-submit").css("opacity", "0.5");
            isChanging = true;
            localforage.getItem("token").then(function (token) {
                $.ajax({
                    url: SERVER_URL + "/api/change-password",
                    method: 'POST',
                    cache: false,
                    async: true,
                    headers: {'Authorization': 'Bearer ' + token},
                    data: {'old_password': $("#opass").val(), 'password': $("#npass").val()},
                    error: function (status, xhr) {
                        console.log(status);
                        alert("Something was wrong when changing your password. Please try again later.");
                        isChanging = false;
                        $("#btn-passwd-submit").css("opacity", "1");
                    },
                    success: function (data, status, xhr) {
                        isChanging = false;
                        if (data.error !== undefined) {
                            $("#btn-passwd-submit").css("opacity", "1");
                            alert(data.error.text);
                        } else {
                            $("#btn-passwd-submit").css("opacity", "1");
                            alert("Password successfully changed!");
                            $("#opass").val("");
                            $("#npass").val("");
                            $("#rnpass").val("");
                        }
                    }
                });
            });
        });
    }
});