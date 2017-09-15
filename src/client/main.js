/* jshint esversion: 6 */
const SERVER_ADDRESS = document.getElementById('editor').href;
const { json2MobileEl } = require('./helper');
// helper disable project links on mobile
var disableMobileProject = () =>{
  if (/Mobi/.test(navigator.userAgent)) {
    // mobile!
    let projectLinks = document.querySelectorAll(`a[href^="${SERVER_ADDRESS}?action"], a[href^="${SERVER_ADDRESS}#present"]`);
    projectLinks.forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        alert('Opening projects on small-screen devies is not fully supported yet. Please try again on a desktop.');
      })
    })
  }
};


$(document).ready(function() {

  var $grid = $('#examples-grid');
  let $gridM = $('#examples-grid-m');
  var $pSlider = $('#projects-slider');

  disableMobileProject();

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

  let revealExamples = () => {
    document.querySelector('.spinner').className += ' hidden';
    $gridM.removeClass('hidden');
    $gridM.isotope('layout');
  };

  // layout the items after the images are loaded
  let images = document.querySelectorAll('#examples-grid-m .element-item img');
  document.querySelector('.spinner').className += ' hidden';
  console.log('preloaded images', loadedImages);
  const LOADING_THRESHOLD = 2;
  if (loadedImages >= images.length - LOADING_THRESHOLD) {
    //reveal and layout isotope
    revealExamples();
  }else {
    images.forEach((img)=>{
      img.addEventListener('load',(e)=>{
        if (loadedImages >= images.length - LOADING_THRESHOLD) {
          revealExamples();
        }
      });
    });
  }


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
    };
  }

  //==== end of isotope ====

  //lightslider
  $pSlider.lightSlider({
    autoWidth: false,
    item: 6,
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
  $('#logout').on('click', (e) => {
    e.preventDefault();
    $.ajax({
      method: 'post',
      url: SERVER_ADDRESS + 'api/logout',
      success: () => {
        document.cookie = "netsblox-cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        updateLoginViews(false);
      }
    });

  });

// goto top button    
  $(window).scroll(function () {
    console.log('scrolled')
    if ($(this).scrollTop() > 50) {
      $('#back-to-top').fadeIn();
    } else {
      $('#back-to-top').fadeOut();
    }
  });
    // scroll body to 0px on click
  $('#back-to-top').click(function () {
    $('#back-to-top').tooltip('hide');
    $('body,html').animate({
        scrollTop: 0
    }, 800);
    return false;
  });

  $('#back-to-top').tooltip('show');

}); // end of document ready func

$('form').submit(function(e) {
  e.preventDefault();
  let username = $('input[name="username"]').val();
  let password = $('input[name="password"]').val();
  let hashedP = sha512(password);

  $.ajax({
    url: SERVER_ADDRESS + 'api/?SESSIONGLUE=.sc1m16',
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
        console.log(document.cookie);
        console.log('logged in');
      postLogin(); // promises..
    },
    fail: err => {
      console.log('failed to log in', err);
    }

  });

  function postLogin() {
    Cookies.set('username', username, {
      expires: 14
    });
    updateLoginViews(true);
  }
}); // end of on submit


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

    $('#userProjects-grid').find('.row').empty();
    $.ajax({
      url: SERVER_ADDRESS + 'api/getProjectList?format=json',
      method: 'GET',
      xhrFields: {
        withCredentials: true
      },
      crossDomain: true,

      success: data => {
        console.log('grabbed user projects', data);
        data.forEach( proj => {
          $('#userProjects-grid').find('.row').append(json2MobileEl(proj));
        });
        disableMobileProject();
        $('#userProjects-grid').removeClass('hidden');
      }
    });
  }
