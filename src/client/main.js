/* global $, loadedImages, Cookies, CLOUD_ADDRESS */
/* jshint esversion: 6 */

const SERVER_ADDRESS = document.getElementById("editor").href.replace(/\/$/, '');
// setup netsblox authenticator
const Cloud = require("./cloud");
let cloud;
const json2MobileEl = require("./helper");
// helper disable project links on mobile

function isMobileDevice() {
  return /Mobi/.test(navigator.userAgent);
}

// alerts and prepares the projects to be opened on a mobile device
var alertMobileMode = () => {
  let projectLinks = document.querySelectorAll('a[href*="ProjectName="');

  projectLinks.forEach((a) => {
    a.addEventListener("click", (_e) => {
      alert(
        'For a better experience install the "NetsBlox Player" app from your app store. Visit /mobile for more info',
      );
    });
    a.href = a.href.replace("&editMode=true", ""); // remove editmode to open in appmode
  });
};

function isMainPage() {
  let is = document.getElementById("examples-grid") !== null;
  return is;
}

// lazyload images
document.addEventListener("DOMContentLoaded", function () {
  var lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));

  if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          let lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          lazyImage.classList.remove("lazy");
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    lazyImages.forEach(function (lazyImage) {
      lazyImageObserver.observe(lazyImage);
    });
  } else {
    // Possibly fall back to a more compatible method here
    lazyImages.forEach((lazyImage) => {
      lazyImage.src = lazyImage.dataset.src;
      lazyImage.classList.remove("lazy");
    });
  }
});

window.onload = async function () {
  console.log('page is ready')
  var $grid = $("#examples-grid");
  var $pSlider = $("#projects-slider");

  // check if is on landing
  if (isMobileDevice()) alertMobileMode();

  // init Isotope
  var qsRegex;
  $grid.isotope({
    // options
    // layoutMode: 'fitRows',
    itemSelector: ".element-item",
    percentPosition: true,
    masonry: {
      columnWidth: ".grid-sizer",
    },
    filter: function () {
      return qsRegex ? $(this).text().match(qsRegex) : true;
    },
  });

  let revealExamples = () => {
    document.querySelector(".spinner").className += " hidden";
    $grid.removeClass("hidden");
    $grid.isotope("layout");
  };

  // layout the items after the images are loaded
  // check if is on main page
  if (isMainPage()) {
    let images = document.querySelectorAll("#examples-grid .element-item img");
    document.querySelector(".spinner").className += " hidden";
    console.log("preloaded images", loadedImages);
    const LOADING_THRESHOLD = 2;
    if (loadedImages >= images.length - LOADING_THRESHOLD) {
      //reveal and layout isotope
      revealExamples();
    } else {
      images.forEach((img) => {
        img.addEventListener("load", () => {
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
  var $quicksearch = $(".quicksearch").keyup(debounce(function () {
    qsRegex = new RegExp($quicksearch.val(), "gi");
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
    onSliderLoad: function () {
      $pSlider.removeClass("cS-hidden");
    },
  });

  // close modal when clicking on backdrop
  // $("body").on("click", ".modal-dialog", function(e) {
  //      if ($(e.target).hasClass('modal-dialog')) {
  //          var hidePopup = $(e.target.parentElement).attr('id');
  //          $('#' + hidePopup).modal('hide');
  //      }
  //  });

  // determine if logged in
  // FIXME: if we allow CORS for the cloud.txt file, we can just use that
  //const response = await fetch(SERVER_ADDRESS + '/cloud.txt');
  //const cloudUrl = response.ok ? await response.text() : 'https://cloud.netsblox.org';
  const cloudUrl = window.CLOUD_ADDRESS || 'https://cloud.netsblox.org';
  const opts = {
    credentials: 'include',
    headers: {'Content-Type': 'application/json'}
  };
  const configResponse = await fetch(cloudUrl + '/configuration', opts);
  let username;
  if (configResponse.ok) {
    const config = await configResponse.json();
    username = config.username;
  }
  cloud = new Cloud(cloudUrl, null, username);
  if (cloud.username) {
    updateLoginViews(true);
  }

  //logout
  $("#logout").on("click", (e) => {
    e.preventDefault();
    cloud.logout()
      .then(() => {
        document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        console.log("logged out");
        updateLoginViews(false);
      });
  });

  // goto top button
  $(window).scroll(function () {
    if ($(this).scrollTop() > 50) {
      $("#back-to-top").fadeIn();
    } else {
      $("#back-to-top").fadeOut();
    }
  });
  // scroll body to 0px on click
  $("#back-to-top").click(function () {
    $("#back-to-top").tooltip("hide");
    $("body,html").animate({
      scrollTop: 0,
    }, 800);
    return false;
  });

  $("#back-to-top").tooltip("show");
};

function updateLoginViews(isLoggedIn) {
  //use toggle?
  if (isLoggedIn) {
    $("#login").addClass("hidden");
    $("#logout").removeClass("hidden");
    $("nav p").removeClass("hidden").find("b").text(cloud.username);
    $("#login-modal").modal("hide");
    if (isMainPage()) grabUserProjects();
  } else { //means we are logging out
    $("nav p").addClass("hidden");
    $("#login").removeClass("hidden");
    $("#logout").addClass("hidden");
    if (isMainPage()) {
      $("#userProjects-grid").addClass("hidden").find(".row").empty();
    }
  }
}

async function grabUserProjects() {
  $("#userProjects-grid").find(".row").empty();
  const projects = await cloud.getProjectList();
  projects
    .map(project => ({
      name: project.name,
      thumbnail: `${cloud.url}/projects/id/${project.id}/thumbnail?aspectRatio=1.33333`
    }))
    .forEach((proj) => {
      $("#userProjects-grid").find(".row").append(json2MobileEl(proj));
    });

  $("#userProjects-grid").removeClass("hidden");
}
