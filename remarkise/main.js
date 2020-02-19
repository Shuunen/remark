/* global $, remark */
'use strict'

$(document).ready(() => {
  var FIXES = [
    {
      message: "Oops, error! But wait I'm fetching the raw GitHub version instead",
      patterns: [
        [/\/\/(www\.)?github.com\//i, '//raw.githubusercontent.com/'],
        [/\/blob\//i, '/'],
      ],
    },
    {
      message: "Oops, error! But wait I'm fetching it through RawGit",
      patterns: [
        [/\/\/raw\.githubusercontent\.com\//i, '//rawgit.com/'],
      ],
    },
  ]

  var CSS = /<style[^>]*>[^<]*<\/style>/ig
  var HEAD = $('head')
  var FRONT_PAGE = $('div#front-page')
  var MESSAGE = $('div#front-page p#message')
  var INPUT = $('div#front-page input#url')
  var BUTTON = $('div#front-page input#button')
  var DROP_AREA = $('div#front-page p#drop-area')
  var URL_PATTERN = /^(file|https?):\/\/.+/i

  var nextFix = 0
  var currentFix
  var newUrl
  var css
  var i

  var reset = () => {
    nextFix = 0
    INPUT.prop('disabled', false)
    INPUT[0].value = ''
  }

  var trigger = (event) => {
    if (event && (event.type === 'click' || (event.type === 'keypress' && event.keyCode === 13))) {
      if (URL_PATTERN.test(INPUT[0].value)) {
        remarkise(INPUT[0].value)
      } else {
        MESSAGE.html("That doesn't look like a valid URL :-/")
      }
    }
  }

  var createPresentationFromText = (data) => {
    FRONT_PAGE.hide()
    css = data.match(CSS)
    if (css) {
      data = data.replace(CSS, '')
      for (i in css) {
        HEAD.append(css[i])
      }
    }
    remark.create({ source: data })
  }

  var getOrigin = (url) => {
    var foo = document.createElement('a')
    foo.href = url
    return foo.origin
  }

  var remarkise = (url) => {
    INPUT.prop('disabled', true)
    MESSAGE.html('Fetching markdown')

    $.ajax({
      url: url,
      error: (data) => {
        newUrl = url

        while (nextFix < FIXES.length && newUrl.toLowerCase() === url.toLowerCase()) {
          currentFix = FIXES[nextFix]

          for (var pattern in currentFix.patterns) {
            newUrl = newUrl.replace(currentFix.patterns[pattern][0], currentFix.patterns[pattern][1])
          }

          if (newUrl.toLowerCase() === url.toLowerCase()) {
            nextFix++
          } else {
            MESSAGE.html(currentFix.message)
          }
        }

        if (newUrl.toLowerCase() !== url.toLowerCase()) {
          remarkise(newUrl)
        } else {
          if (window.location.origin.toLowerCase() === getOrigin(url).toLowerCase()) {
            MESSAGE.html('Error!')
          } else {
            MESSAGE.html('Error! (probably a violation of the <a href="https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy">same-origin policy</a>)')
          }
          reset()
        }
      },
      success: (data) => {
        if (window.location.origin.toLowerCase() !== getOrigin(url).toLowerCase()) {
          MESSAGE.html('Error! (probably a violation of the <a href="https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy">same-origin policy</a>)')
        } else {
          if (!window.location.search || !window.location.search.match(/\?url=.+/)) {
            history.pushState({}, null, window.location.href + '?' + $.param({ url: url }))
          }
          createPresentationFromText(data)
        }
      },
    })
  }

  if (window.location.search && window.location.search.match(/\?url=.+/)) {
    remarkise(decodeURIComponent(window.location.search.split('=')[1]))
  } else {
    INPUT.keypress(trigger)
    BUTTON.click(trigger)
  }

  if (typeof window.FileReader === 'undefined') {
    DROP_AREA.removeClass('success')
    DROP_AREA.addClass('fail')
  } else {
    DROP_AREA.removeClass('fail')
    DROP_AREA.addClass('success')
  }

  DROP_AREA.on('dragover', () => {
    $(this).addClass('hover')
    return false
  })

  DROP_AREA.on('dragend', () => {
    $(this).removeClass('hover')
    return false
  })

  DROP_AREA.on('drop', (e) => {
    $(this).removeClass('hover')

    e.preventDefault()
    e.stopPropagation()

    var file = e.originalEvent.dataTransfer.files[0]
    var reader = new FileReader()

    reader.onloadend = () => {
      // load presentation from text
      createPresentationFromText(reader.result)
    }

    reader.readAsText(file)

    return false
  })
})
