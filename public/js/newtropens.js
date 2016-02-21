$(document).ready(function(){

	var socket = io.connect('http://' + window.location.hostname);
	var torrents;
	var date, day, h, m;
	var isRemote = (window.location.pathname == '/remote');
	var modalShown = false;
	var accept = true;

	$("#bleft").on("tap", function(){emit('nav', {dir: 'left'});});
	$("#bright").on("tap", function(){emit('nav', {dir: 'right'});});
	$("#bok").bind("tap", function(){emit('nav', {dir: 'ok'});});
	$("#beject").bind("tap", function(){emit('nav', {dir: 'eject'});});

	socket.emit('verif', {});

	$('.modal-trigger').leanModal({
		dismissible: false,
	});

	setInterval(function (){
		date = new Date();
		day = date.getDay();
		h = date.getHours();
		m = date.getMinutes();
		s = date.getSeconds();

		if(h < 10){
			h = "0" + h;
		} else if(m < 10){
			m = "0" + m;
		} else if(s < 10){
			s = "0" + s;
		}
		$(".hours").text(h + ":" + m + ":" + s);
	}, 1000);

	$("#code_input").on('input', function(){
		socket.emit('verif', {new: true, token: $(this).val()});
		console.log("change");
	});

	socket.on('data', function(data){
		console.log(data);
		if(data.type == 'nav'){
			navigation(data.data.dir);
		} else if(data.type == 'torrent-info'){
			
		} else if(data.type == 'accept'){
			var modal = isRemote ? "#code" : "#remoteconfig";
			if(!data.accept){
				$('#remoteconfig .modal-content h5').html("Connectez-vous a l'adresse <br><br> <b>http://" + data.ip + ":3000/remote</b> <br><br> sur votre périphérique servant comme télécommande et entrez ce code : <br><br><a class='waves-effect waves-light btn'>" + data.token + "</a>");
				if(!modalShown && !data.bad){
					$(modal).openModal();
					modalShown = true;
				}
			} else {
				$(modal).closeModal();
				modalShown = false;
				Materialize.toast('Télécommande connectée', 4000);
			}
			accept = data.accept;
		}
	});

	function readTorrent(path){
		$("#media-player").css({"display" : "block"});
		$("#media-player").append('<video id="media-video" preload="auto" autobuffer controls width="100%" height="100%" autoplay><source src="http://localhost:3000/video/' + path + '" type="video/mp4"></video>');
		$("#media-player #media-video").on("ended", function() {
			$(this).attr('src', 'http://localhost:3000/video/' + path);
			$(this)[0].load();
			$(this)[0].play();
		});
	}

	socket.on('torrents', function(data){
		torrents = data;
		console.log(JSON.stringify(torrents));
	});

	var right_scroll = 0;

	function navigation(dir){
		console.log("dir");
		var movie_cover;
		if(dir == 'left' && $('.remote-select').prev().is('div')){
			right_scroll--;
			$('.remote-select').removeClass('remote-select').prev().addClass('remote-select');
			getPhotosPreview(replaceBadWords($('.remote-select').attr('name')));
			if(right_scroll > 2) $('#films').animate({scrollLeft: '-=150'}, 300);
		} else if(dir == 'right' && $('.remote-select').next().is('div')){
			right_scroll++;
			$('.remote-select').removeClass('remote-select').next().addClass('remote-select');
			getPhotosPreview(replaceBadWords($('.remote-select').attr('name')));
			if(right_scroll > 3) $('#films').animate({scrollLeft: '+=150'}, 300);
		} else if(dir == 'ok'){
			socket.emit('start_torrent', {url: $('.remote-select').attr("href")});
		} else if(dir == 'stop'){
			socket.emit('stop_torrent', {});
		}
	}

	function replaceBadWords(string){
		var badWords = new Array('french', 'dvdrip', 'x264', 'camrip', 'cam', 'ts', 'predvd', 'ppvrip', 'dvdscr', 'r5', 'hdtv', 'tvrip', 'dthrip', 'bdrips');
		var yearsCenturies = new Array('19', '20');
		var testString = string.toLowerCase();
		for(var i = 0; i < yearsCenturies.length; i++){
			if(testString.indexOf(yearsCenturies[i]) != -1){
				string = string.slice(0, testString.indexOf(yearsCenturies[i])) + string.slice(testString.indexOf(yearsCenturies[i]) + 4);
			}
		}
		for(var i = 0; i < badWords.length; i++){
			var reg = new RegExp(badWords[i], 'ig');
			string = string.replace(reg, '');
		}
		console.log(string);
		return string;
	}

	$.ajax({
		url: '/api?cpasbien=x264',
		async: false,
		success : function(data){
			torrents = data.items;
		}
	});

	var photos;
	var intervalPhotoChange;
	var index = 0;

	function getPhotosPreview(title){
		clearInterval(intervalPhotoChange);
		blurIn('.background');
		index = 0;
		photos = new Array();
		var photosGotten;
		$.ajax({
			url: '/api?allocine=' + title,
			async: true,
			success : function(data){
				console.log(data);
				photosGotten = data;
				for(var i = 0; i < photosGotten.length; i++){
					if(photosGotten[i].type.$ == "Photo"){
						photos.push(photosGotten[i]);
					}
				}
				setInterval(changeImg, 5000);
			}
		});
	}

	console.log(torrents);

	for(var i = 0; i < torrents.length; i++){
		var first = (i == 0);
		$("#films").append(
			'<div name="' + torrents[i].title + '" href="' + torrents[i].torrent + '" style="background-image: url(' + torrents[i].cover + ')" class="film"></div>'
			);
	}

	$("#films .film").first().addClass("remote-select");
	getPhotosPreview(replaceBadWords($('.remote-select').attr('name')));

	function changeImg(){
		console.log('lol');
		index++;
		if(index > photos.length) index = 0;
		$('.background').attr('src', photos[index].rendition[0].href).on('load', setTimeout(blurOut('.background'), 5000));
	}

	var blurredIn;

	function blurIn(item){
		blurredIn = true;
		$({blurRadius: 0}).animate({blurRadius: 10}, {
			duration: 1000,
	        easing: 'swing', // or "linear"
	                         // use jQuery UI or Easing plugin for more options
	                         step: function() {
	                         	$(item).css({
	                         		"-webkit-filter": "blur("+this.blurRadius+"px)",
	                         		"filter": "blur("+this.blurRadius+"px)"
	                         	});
	                         }
	                     });
	}

	function blurOut(item){
		console.log(blurredIn);
		if(blurredIn){
			$({blurRadius: 10}).animate({blurRadius: 0}, {
				duration: 1000,
		        easing: 'swing', // or "linear"
		                         // use jQuery UI or Easing plugin for more options
		                         step: function() {
		                         	$(item).css({
		                         		"-webkit-filter": "blur("+this.blurRadius+"px)",
		                         		"filter": "blur("+this.blurRadius+"px)"
		                         	});
		                         }
		                     });

			blurredIn = false;
		}
	}


//if(detectmob && (window.location.pathname == "/")) window.location.href = '/remote';

function detectmob() { 
	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ){
		return true;
	}
	else {
		return false;
	}
}

function emit(type, data){
	socket.emit('data', {type: type, data: data});
}
});

