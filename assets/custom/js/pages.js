'use strict';

/*
|------------------------------------------------------------------------------
| Coming Soon
|------------------------------------------------------------------------------
*/

myApp.onPageInit('coming-soon', function(page) {

	var countdownDate = new Date('Jan 1, 2018 00:00:00').getTime();

	/* Update the countdown every 1s */
	var x = setInterval(function() {
		/* Get today's date and time */
		var now = new Date().getTime();

		/* Find the duration between now and the countdown date */
		var duration = countdownDate - now;

		/* Time calculations for days, hours, minutes and seconds */
		var days = Math.floor(duration / (1000 * 60 * 60 * 24));
		var hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		var minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
		var seconds = Math.floor((duration % (1000 * 60)) / 1000);

		/* Show countdown timer */
		$$('.page[data-page=coming-soon] .countdown-timer .days .value').text(days);
		$$('.page[data-page=coming-soon] .countdown-timer .hours .value').text(hours);
		$$('.page[data-page=coming-soon] .countdown-timer .minutes .value').text(minutes);
		$$('.page[data-page=coming-soon] .countdown-timer .seconds .value').text(seconds);

		/* If the countdown is finished, do something */
		if (duration < 0) {
			clearInterval(x);
			mainView.router.load({
				url: 'home.html'
			});
		}
	}, 1000);

	/* Notify Me */
	$$('.page[data-page=coming-soon] #modal-notify-me').on('click', function(e) {
		e.preventDefault();
		myApp.prompt('Enter your email and we\'ll let you know when Nectar is available.', 'Notify Me', function(value) {
			if(value.trim().length > 0) {
				myApp.addNotification({
					message: 'Thank You',
					hold: 1500,
					button: {
						text: ''
					}
				});
				mainView.router.back();
			}
    });
	});

});

/*
|------------------------------------------------------------------------------
| Relasi
|------------------------------------------------------------------------------
*/

myApp.onPageInit('relasi', function(page) {
    $(".close-popup").click(function() {
       history.back();
    });

	var myRelations = [];
	/* Load Relations*/
    localforage.getItem("relasi").then(function(readValue) {
        if(readValue == null) {
            myRelations = [];
        } else {
            myRelations = readValue;
        }

        initialize();
    });

    function initialize() {
        var relationsAlphabetic = [];
        var addedLetters = [];

        for (var key in myRelations) {
            var value = myRelations[key];
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
            content += '<li class="swipeout" data-uid="' + card.uid[0].value + '">\n' +
                '\t\t\t\t\t\t<div class="item-content swipeout-content" data-action="view-contact">\n' +
                '\t\t\t\t\t\t\t<div class="item-media">\n' +
                '\t\t\t\t\t\t\t\t<img class="img-circle" src="assets/custom/img/avatar.png" width="40" alt="" />\n' +
                '\t\t\t\t\t\t\t</div>\n' +
                '\t\t\t\t\t\t\t<div class="item-inner">\n' +
                '\t\t\t\t\t\t\t\t<div class="item-title">' + card.fn[0].value + '</div>\n' +
                '\t\t\t\t\t\t\t</div>\n' +
                '\t\t\t\t\t\t</div>\n' +
                '\t\t\t\t\t\t<div class="swipeout-actions swipeout-actions-left">\n' +
                '\t\t\t\t\t\t\t<a href="tel:' + card.fn[0].value + '" class="external swipeout-action bg-blue">\n' +
                '\t\t\t\t\t\t\t\t<i class="swipeout-action-icon fa fa-phone"></i>\n' +
                '\t\t\t\t\t\t\t\t<span class="swipeout-action-label">Telepon</span>\n' +
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
                '\t\t\t\t\t\t\t\t<span class="swipeout-action-label">Hapus</span>\n' +
                '\t\t\t\t\t\t\t</a>\n' +
                '\t\t\t\t\t\t</div>\n' +
                '\t\t\t\t\t</li>';
        }

        // If relations is more than zero, add closing tag
        if(relationsAlphabetic.length > 0) content += '</ul></div>';

        $("#relasi-list").html(content);

        /* Search Bar */
        var mySearchbar = myApp.searchbar('.page[data-page=relasi] .searchbar', {
            searchList: '.page[data-page=relasi] .list-block-search',
            searchIn: '.page[data-page=relasi] .item-title'
        });

        /* View Contact */
        $$('.page[data-page=relasi] [data-action=view-contact]').on('click', function(e) {
            e.preventDefault();
            var el = $(this).closest('.swipeout');
            var uid = $(el).attr("data-uid");

            if(myRelations[uid] != undefined)
            	viewRelasi(myRelations[uid]);
            else
            	alert("Relasi sudah dihapus atau tidak ada");
        });

        /* Delete Contact */
        $$('.page[data-page=relasi] [data-action=delete-contact]').on('click', function(e) {
            e.preventDefault();
            var el = $(this).closest('.swipeout');
            myApp.confirm('Kamu ingin menghapus relasi ini?',
                function() {
                    delete myRelations[$(el).attr("data-uid")];
                    localforage.setItem('relasi', myRelations).then(function(value) {
                        myRelations = value;
                        myApp.swipeoutDelete(el, function(){
                            myApp.addNotification({
                                message: 'Relasi terhapus',
                                hold: 1500,
                                button: {
                                    text: ''
                                }
                            });
                        });
                    }).catch(function(err) {
                        console.log(err);
                    });
                }
            );
            myApp.swipeoutClose(el);
        });
	}

    $("#r-btn-add-relasi").on('click', function() {
        if(myRelations[openCard.uid[0].value] == undefined) {
            addRelasi(openCard);
        } else {
            myApp.confirm('Kamu ingin menghapus relasi ini?',
                function() {
                    deleteRelasi(openCard.uid[0].value);
                });
        }
    });

    function addRelasi(card) {
        var uid = card.uid[0].value;
        myRelations[uid] = card;
        localforage.setItem('relasi', myRelations).then(function(value) {
            myRelations = value;
            setupRelasiButton();
        }).catch(function(err) {
            console.log(err);
        });
    }

    function deleteRelasi(uid) {
        delete myRelations[uid];
        localforage.setItem('relasi', myRelations).then(function(value) {
            myRelations = value;
            setupRelasiButton();
        }).catch(function(err) {
            console.log(err);
        });
    }

    var openCard;

    function viewRelasi(cd) {
        // It is a vCard
		openCard = cd;
        window.history.pushState('', '', '#!/' + window.history.state.url + '?&popup');
        myApp.popup('.popup-profile-relasi');

        $("#r-btn-add-vcf").attr('href', 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vCard.generate(cd)));

        $("#r-contact-name").html(cd.fn[0].value);
        $("#r-contact-org").html(cd.org[0].value);
        if(cd.uid != undefined) $("#r-contact-uid").html(cd.uid[0].value);

        if(cd.note != undefined)
            $("#r-contact-cat").html(Array.isArray(cd.note[0].value) ? cd.note[0].value.join(", ") : cd.note[0].value);
        else
            $("#r-contact-cat").html("<i>Tidak ada data</i>");

        if(cd.email != undefined)
            $("#r-contact-email").html(cd.email[0].value).attr("href", "mailto:" + cd.email[0].value);
        else
            $("#r-contact-email").html("<i>Tidak ada data</i>").removeAttr("href");

        if(cd.tel != undefined)
            $("#r-contact-mobile").html(cd.tel[0].value).attr("href", "tel:" + cd.tel[0].value);
        else
            $("#r-contact-mobile").html("<i>Tidak ada data</i>").removeAttr("href");

        if(cd.adr != undefined)
            $("#r-contact-address").html(Array.isArray(cd.adr[0].value) ? cd.adr[0].value.join(', ') : cd.adr[0].value);
        else
            $("#r-contact-address").html("<i>Tidak ada data</i>");

        if(cd['X-LINE'] != undefined)
            $("#r-contact-line").html(cd['X-LINE'][0].value).attr("href", "line://ti/p/~" + cd['X-LINE'][0].value);
        else
            $("#r-contact-line").html("<i>Tidak ada data</i>").removeAttr("href");

        if(cd['X-INSTAGRAM'] != undefined)
            $("#r-contact-instagram").html(cd['X-INSTAGRAM'][0].value).attr("href", "https://instagram.com/" + cd['X-INSTAGRAM'][0].value.replace('@', ''));
        else
            $("#r-contact-instagram").html("<i>Tidak ada data</i>").removeAttr("href");

        setupRelasiButton();
    }

    function setupRelasiButton() {
        if(myRelations[openCard.uid[0].value] == undefined) {
            $("#r-btn-add-relasi .item-title").html("Tambahkan Relasi");
        } else {
            $("#r-btn-add-relasi .item-title").html("<span style='color:#f44336'>Hapus Relasi</span>");
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

    $("#qrscan-error").fadeOut(0);
    setTimeout(function() {
        $("#qrscan-error").fadeIn(250);
    }, 2000);

    if(DetectRTC.isWebRTCSupported) {
        // webcam is available
        if (Instascan != undefined) {
            scanner = new Instascan.Scanner({video: document.getElementById('preview'), backgroundScan: false, mirror: false});
            scanner.addListener('scan', function (content) {
                console.log(content);
                processVcardData(content);
            });
            Instascan.Camera.getCameras().then(function (cameras) {
                if (cameras.length > 0) {
                    scanner.start(cameras[0]);
                } else {
                    console.error('No cameras found.');
                    $("#qrscan-manual").fadeIn(0);
                    $("#qrscan-webrtc").fadeOut(0);
                }
            }).catch(function (e) {
                console.error(e);
            });
        }

        $("#qrscan-webrtc").fadeIn(0);
    } else {
        // webcam is not available
        $("#qrscan-webrtc").fadeOut(0);
    }

    $("#btn-add-relasi").on('click', function() {
        if(myRelations[card.uid[0].value] == undefined) {
            addRelasi(card);
        } else {
            myApp.confirm('Kamu ingin menghapus relasi ini?',
                function() {
                    deleteRelasi(card.uid[0].value);
                });
        }
    });

    var myRelations = [];
    var card;
    /* Load Relations*/
    localforage.getItem("relasi").then(function(readValue) {
        if(readValue == null) {
            myRelations = [];
        } else {
            myRelations = readValue;
        }
    });

    function addRelasi(card) {
        var uid = card.uid[0].value;
        myRelations[uid] = card;
        localforage.setItem('relasi', myRelations).then(function(value) {
            myRelations = value;
            setupRelasiButton();
        }).catch(function(err) {
            console.log(err);
        });
    }

    function deleteRelasi(uid) {
        delete myRelations[uid];
        localforage.setItem('relasi', myRelations).then(function(value) {
            myRelations = value;
            setupRelasiButton();
        }).catch(function(err) {
            console.log(err);
        });
    }

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
        if(myRelations[card.uid[0].value] == undefined) {
            $("#btn-add-relasi .item-title").html("Tambahkan Relasi");
        } else {
            $("#btn-add-relasi .item-title").html("<span style='color:#f44336'>Hapus Relasi</span>");
        }
    }

    function processVcardData(data) {
        if(data.startsWith("BEGIN:VCARD") && data.replace(/\n$/, "").replace(/\r$/, "").endsWith("END:VCARD")) {
            // It is a vCard
            window.history.pushState('', '', '#!/' + window.history.state.url + '?&popup');
            myApp.popup('.popup-profile-qrc');

            $("#btn-add-vcf").attr('href', 'data:text/vcard;charset=utf-8,' + encodeURIComponent(data));

            card = vCard.parse(data);
            $("#contact-name").html(card.fn[0].value);
            $("#contact-org").html(card.org[0].value);
            if(card.uid != undefined) $("#contact-uid").html(card.uid[0].value);

            if(card.note != undefined)
                $("#contact-cat").html(Array.isArray(card.note[0].value) ? card.note[0].value.join(", ") : card.note[0].value);
            else
                $("#contact-cat").html("<i>Tidak ada data</i>");

            if(card.email != undefined)
                $("#contact-email").html(card.email[0].value).attr("href", "mailto:" + card.email[0].value);
            else
                $("#contact-email").html("<i>Tidak ada data</i>").removeAttr("href");

            if(card.tel != undefined)
                $("#contact-mobile").html(card.tel[0].value).attr("href", "tel:" + card.tel[0].value);
            else
                $("#contact-mobile").html("<i>Tidak ada data</i>").removeAttr("href");

            if(card.adr != undefined)
                $("#contact-address").html(Array.isArray(card.adr[0].value) ? card.adr[0].value.join(', ') : card.adr[0].value);
            else
                $("#contact-address").html("<i>Tidak ada data</i>");

            if(card['X-LINE'] != undefined)
                $("#contact-line").html(card['X-LINE'][0].value).attr("href", "line://ti/p/~" + card['X-LINE'][0].value);
            else
                $("#contact-line").html("<i>Tidak ada data</i>").removeAttr("href");

            if(card['X-INSTAGRAM'] != undefined)
                $("#contact-instagram").html(card['X-INSTAGRAM'][0].value).attr("href", "https://instagram.com/" + card['X-INSTAGRAM'][0].value.replace('@', ''));
            else
                $("#contact-instagram").html("<i>Tidak ada data</i>").removeAttr("href");

            setupRelasiButton();
        } else {
            alert("Kode QR salah atau tidak terbaca.");
        }
    }
});

myApp.onPageBeforeRemove('relasi-capture', function(page) {
    scanner.stop();
});

/*
|------------------------------------------------------------------------------
| Home
|------------------------------------------------------------------------------
*/

myApp.onPageInit('home', function(page) {

    // Remove history
    //mainView.history = [];

	/* Hero Slider */
	myApp.swiper('.page[data-page=home] .slider-hero .swiper-container', {
		autoplay: 10000,
		loop: true,
		pagination: '.swiper-pagination',
		paginationClickable: true
	});

	/* Theme Color */
	if (sessionStorage.getItem('nectarMaterialThemeColor')) {
		$$('input[name=theme-color][value=' + sessionStorage.getItem('nectarMaterialThemeColor') + ']').prop('checked', true);
	}

	$$('input[name=theme-color]').on('change', function() {
		if (this.checked) {
			$$('body').removeClass('theme-red theme-pink theme-purple theme-deeppurple theme-indigo theme-blue theme-lightblue theme-cyan theme-teal theme-green theme-lightgreen theme-lime theme-yellow theme-amber theme-orange theme-deeporange theme-brown theme-gray theme-bluegray theme-white theme-black');
			$$('body').addClass('theme-' + $$(this).val());
			sessionStorage.setItem('nectarMaterialThemeColor', $$(this).val());
    }
  });

	/* Theme Mode */
	if (sessionStorage.getItem('nectarMaterialThemeLayout')) {
		$$('input[name=theme-layout][value=' + sessionStorage.getItem('nectarMaterialThemeLayout') + ']').prop('checked', true);
	}

	$$('input[name=theme-layout]').on('change', function() {
		if (this.checked) {
			switch($$(this).val()) {
				case 'dark':
					$$('body').removeClass('layout-dark');
					$$('body').addClass('layout-' + $$(this).val());
				break;
				default:
					$$('body').removeClass('layout-dark');
				break;
			}
			sessionStorage.setItem('nectarMaterialThemeLayout', $$(this).val());
    }
  });

	/* Share App */
	$$('[data-action=share-app]').on('click', function(e) {
		e.preventDefault();
		var buttons = [
			{
        text: 'Share Nectar',
				label: true
      },
			{
				text: '<i class="fa fa-fw fa-lg fa-envelope-o color-red"></i>&emsp;<span>Email</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-facebook color-facebook"></i>&emsp;<span>Facebook</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-google-plus color-googleplus"></i>&emsp;<span>Google+</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-linkedin color-linkedin"></i>&emsp;<span>LinkedIn</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-twitter color-twitter"></i>&emsp;<span>Twitter</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-whatsapp color-whatsapp"></i>&emsp;<span>WhatsApp</span>'
			}
    ];
		myApp.actions(buttons);
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
			myApp.addNotification({
        message: 'Welcome',
				hold: 1500,
				button: {
					text: ''
				}
			});
			mainView.router.load({
				url: 'home.html'
			});
		}
	});

});

/*
|------------------------------------------------------------------------------
| Settings
|------------------------------------------------------------------------------
*/

myApp.onPageInit('settings', function(page) {

	/* Share App */
	$$('.page[data-page=settings] [data-action=share-app]').on('click', function(e) {
		e.preventDefault();
		var buttons = [
			{
        text: 'Share Nectar',
				label: true
      },
			{
				text: '<i class="fa fa-fw fa-lg fa-envelope-o color-red"></i>&emsp;<span>Email</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-facebook color-facebook"></i>&emsp;<span>Facebook</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-google-plus color-googleplus"></i>&emsp;<span>Google+</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-linkedin color-linkedin"></i>&emsp;<span>LinkedIn</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-twitter color-twitter"></i>&emsp;<span>Twitter</span>'
			},
			{
				text: '<i class="fa fa-fw fa-lg fa-whatsapp color-whatsapp"></i>&emsp;<span>WhatsApp</span>'
			}
    ];
		myApp.actions(buttons);
	});

});

/*
|------------------------------------------------------------------------------
| Sign Up
|------------------------------------------------------------------------------
*/

myApp.onPageInit('signup', function(page) {

	/* Show|Hide Password */ 
	$$('.popup-signup-email [data-action=show-hide-password]').on('click', function() {
		if ($$('.popup-signup-email input[data-toggle=show-hide-password]').attr('type') === 'password') {
			$$('.popup-signup-email input[data-toggle=show-hide-password]').attr('type', 'text');
			$$(this).attr('title', 'Hide');
			$$(this).children('i').text('visibility_off');
		}
		else {
			$$('.popup-signup-email input[data-toggle=show-hide-password]').attr('type', 'password');
			$$(this).attr('title', 'Show');
			$$(this).children('i').text('visibility');
		}
	});

	/* Validate & Submit Form */
	$('.popup-signup-email form[name=signup-email]').validate({
		rules: {
			name: {
				required: true
			},
			email: {
				required: true,
        email:true
      },
      password: {
				required: true,
				minlength: 8
			}
		},
    messages: {
			name: {
				required: 'Please enter name.'
			},
			email: {
				required: 'Please enter email address.',
        email: 'Please enter a valid email address.'
      },
			password: {
				required: 'Please enter password.',
				minlength: 'Password must be at least 8 characters long.'
      }
		},
		onkeyup: false,
    errorElement : 'div',
		errorPlacement: function(error, element) {
			error.appendTo(element.parent().siblings('.input-error'));
		},
		submitHandler: function(form) {
			myApp.closeModal('.popup-signup-email');
			myApp.addNotification({
        message: 'Thank you for signing up with us.',
				hold: 2000,
				button: {
					text: ''
				}
			});
			mainView.router.load({
				url: 'login.html'
			});
		}
	});

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

    setTimeout(function(){
        mainView.router.load({
            url: 'home.html',
            pushState: true
        });
        mainView.history = [];
    }, 200);

    $$('.page[data-page=splash-screen] .splash-preloader').css('opacity', 1);

});

/*
|------------------------------------------------------------------------------
| User Profile
|------------------------------------------------------------------------------
*/

myApp.onPageInit('user-profile', function(page) {

	/* Portfolio Images Browser */
	$$('body').on('click', '.page[data-page=user-profile] #tab-portfolio .image-gallery .image-wrapper img', function() {
		var photos = [];

		$('.page[data-page=user-profile] #tab-portfolio .image-gallery .image-wrapper img').each(function() {
			photos.push({
				url: $(this).attr('src'),
				caption: $(this).attr('alt')
			});
		});

		var myPhotoBrowser = myApp.photoBrowser({
    	photos: photos,
			exposition: false,
			lazyLoading: true,
			lazyLoadingInPrevNext: true,
			lazyLoadingOnTransitionStart: true,
			loop: true
		});
		myPhotoBrowser.open();
	});

});

/*
|------------------------------------------------------------------------------
| Walkthrough
|------------------------------------------------------------------------------
*/

myApp.onPageInit('walkthrough', function(page) {

	/* Initialize Slider */
	myApp.swiper('.page[data-page=walkthrough] .walkthrough-container', {
		pagination: '.page[data-page=walkthrough] .walkthrough-pagination',
		paginationClickable: true
	});

});