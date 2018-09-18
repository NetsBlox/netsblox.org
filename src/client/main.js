/* global $, loadedImages, Cookies, AuthHandler*/
/* jshint esversion: 6 */

const SERVER_ADDRESS = document.getElementById('editor').href;
// setup netsblox authenticator
const auth = new AuthHandler(SERVER_ADDRESS);
const json2MobileEl = require('./helper');
// helper disable project links on mobile
var alertMobileMode = () =>{
    if (/Mobi/.test(navigator.userAgent)) {
    // mobile!
        let projectLinks = document.querySelectorAll(`a[href^="${SERVER_ADDRESS}?action"], a[href^="${SERVER_ADDRESS}#present"]`);
        projectLinks.forEach(a => {
            a.addEventListener('click', e => {
                alert('For a better experience install the "NetsBlox Player" app from your app store. Visit /mobile for more info');
            });
        });
    }
};

function isMainPage(){
    let is = document.getElementById('examples-grid') !== null;
    return is;
}

$(document).ready(function() {

    var $grid = $('#examples-grid');
    var $pSlider = $('#projects-slider');

    // check if is on landing
    alertMobileMode();

    // init Isotope
    var qsRegex;
    $grid.isotope({
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
        $grid.removeClass('hidden');
        $grid.isotope('layout');
    };

    // layout the items after the images are loaded
    // check if is on main page
    if (isMainPage()){
        let images = document.querySelectorAll('#examples-grid .element-item img');
        document.querySelector('.spinner').className += ' hidden';
        console.log('preloaded images', loadedImages);
        const LOADING_THRESHOLD = 2;
        if (loadedImages >= images.length - LOADING_THRESHOLD) {
            //reveal and layout isotope
            revealExamples();
        }else {
            images.forEach((img)=>{
                img.addEventListener('load',()=>{
                    if (loadedImages >= images.length - LOADING_THRESHOLD) {
                        revealExamples();
                    }
                });
            });
        }
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
        $grid.isotope();
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
        auth.logout()
            .then(() => {
                document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
                console.log('logged out');
                updateLoginViews(false);
            });
    });

    // goto top button
    $(window).scroll(function () {
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
    if (!username || !password) {
        alert('Fill in your username and password');
        return;
    }
    $('input[name="password"]').val('');

    auth.login(username, password )
        .then(() => {
            console.log('logged in');
            postLogin();
        })
        .catch(err => {
            alert(err.request.responseText);
            console.log('failed to log in', err);
        });

    function postLogin() {
        Cookies.set('username', username);
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
        if (isMainPage()) grabUserProjects();
    } else { //means we are logging out
        $('nav p').addClass('hidden');
        $('#login').removeClass('hidden');
        $('#logout').addClass('hidden');
        if (isMainPage()) $('#userProjects-grid').addClass('hidden').find('.row').empty();
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
            $('#userProjects-grid').removeClass('hidden');
        }
    });
}
