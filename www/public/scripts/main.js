// let serverAdr = 'https://editor.netsblox.org';
let serverAdr = 'http://local.netsblox.org:8080';


$(document).ready(function() {

	var $grid = $('#examples-grid');
	let $gridM = $('#examples-grid-m');
	var $pSlider = $('#projects-slider');



	// init Isotope
	var qsRegex;
	$gridM.isotope({
			// options
			// layoutMode: 'fitRows',
			itemSelector: '.element-item',
			percentPosition: true,
			masonry: {
				columnWidth: '.grid-sizer'
			},
			filter: function() {
				return qsRegex ? $(this).text().match(qsRegex) : true;
			}
		});

	// setup button filters for isotope
	// $('.filter-button-group').on( 'click', 'button', function() {
	//   var filterValue = $(this).attr('data-filter');
	//   $(this).addClass('active');
	//   $(this).siblings().removeClass('active');
	//   $grid.isotope({ filter: filterValue });
	// });

	//filter items on search
	// use value of search field to filter
	var $quicksearch = $('.quicksearch').keyup(debounce(function() {
		qsRegex = new RegExp($quicksearch.val(), 'gi');
		$gridM.isotope();
	}, 200));

	// debounce so filtering doesn't happen every millisecond
	function debounce(fn, threshold) {
		var timeout;
		return function debounced() {
			if (timeout) {
				clearTimeout(timeout);
			}

			function delayed() {
				fn();
				timeout = null;
			}
			timeout = setTimeout(delayed, threshold || 100);
		}
	}

	//==== end of isotope ====

	//lightslider
	$pSlider.lightSlider({
		autoWidth: false,
		item: 5,
		pager: false,
		loop: true,
		auto: true,
		pauseOnHover: true,
		onSliderLoad: function() {
			$pSlider.removeClass('cS-hidden');
		}
	});



	// close modal when clicking on backdrop
	// $("body").on("click", ".modal-dialog", function(e) {
	//      if ($(e.target).hasClass('modal-dialog')) {
	//          var hidePopup = $(e.target.parentElement).attr('id');
	//          $('#' + hidePopup).modal('hide');
	//      }
	//  });

	// determine if logged in
	let user = Cookies.get('username');
	if (user !== undefined) {
		updateLoginViews(true);
	}


	//logout 
	$('#logout').on('click', () => {
		Cookies.remove('username');
		Cookies.remove('netsblox-cookie');
		updateLoginViews(false);
	})


}); // end of document ready func

$('form').submit(function(e) {
	e.preventDefault();
	let username = $('input[name="username"]').val();
	let password = $('input[name="password"]').val();
	let hashedP = SHA512(password);
	console.log(username, hashedP);

	$.ajax({
		url: serverAdr + '/api/?SESSIONGLUE=.sc1m16',
		method: 'POST',
		data: JSON.stringify({
			__h: hashedP,
			__u: username,
			remember: true
		}),
		contentType: "application/json; charset=utf-8",
		xhrFields: {
			withCredentials: true
		},
		crossDomain: true,
		statusCode: {
			403: function(xhr) {
										// login failed ( catching using status code due to the response)
										console.log(xhr.responseText);
										alert(xhr.responseText);
									}
								},
								success: data => {
									console.log('logged in');
								postLogin(); // promises..
							},
							fail: err => {
								console.log(err);
							}

						})


	function postLogin() {
		Cookies.set('username', username, {
			expires: 14
		});
		grabUserProjects();
		updateLoginViews(true);
	}




		}) // end of on submit


function updateLoginViews(isLoggedIn) {
		//use toggle? 
		if (isLoggedIn) {
			$('#login').addClass('hidden');
			$('#logout').removeClass('hidden');
			$('nav p').removeClass('hidden').find('b').text(Cookies.get('username'));
			$('#login-modal').modal('hide');
			grabUserProjects();
		} else { //means we are logging out
			$('#login').removeClass('hidden');
			$('#logout').addClass('hidden');
			$('#userProjects-grid').addClass('hidden').find('row').empty();
			$('nav p').addClass('hidden');
		}
	}
function grabUserProjects(){
	$.ajax({
		url: serverAdr + '/api//getProjectList?format=json',
		method: 'GET',
		xhrFields: {
			withCredentials: true
		},
		crossDomain: true,

		success: data => {
			let $userProjsWrapper = $('#userProjects-grid').removeClass('hidden');
			console.log('grabbed user projects', data);
			$userProjsWrapper.find('.row').empty();
			data.forEach( proj => {
				$userProjsWrapper.find('.row').append(json2MobileEl(proj));
			})
		}
	})
}