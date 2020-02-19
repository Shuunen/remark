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
  var FRONT_PAGE = $('#front-page')
  var MESSAGE = $('#remarkise-message')
  var INPUT = $('#remarkise-url')
  var BUTTON = $('#remarkise-button')
  var DROP_AREA = $('#remarkise-drop-area')
  var URL_PATTERN = /^(file|https?):\/\/.+/i
  const uploadInputEl = document.querySelector('#remarkise-upload')

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

  const fileReaderAvailable = typeof window.FileReader === 'undefined'
  DROP_AREA.toggleClass('hidden', fileReaderAvailable)

  const readLocalFile = (file) => {
    var reader = new FileReader()
    reader.onloadend = () => createPresentationFromText(reader.result)
    reader.readAsText(file)
  }

  uploadInputEl.addEventListener('change', () => {
    console.log('upload file input change and selection is', uploadInputEl.value)
    readLocalFile(uploadInputEl.files[0])
  })

  DROP_AREA.on('click', () => {
    console.log('click')
    uploadInputEl.click()
  })

  DROP_AREA.on('dragover', () => {
    DROP_AREA.addClass('bg-orange-100')
    return false
  })

  DROP_AREA.on('dragend', () => {
    DROP_AREA.removeClass('bg-orange-100')
    return false
  })

  DROP_AREA.on('drop', (e) => {
    DROP_AREA.removeClass('bg-orange-100')
    e.preventDefault()
    e.stopPropagation()
    const file = e.originalEvent.dataTransfer.files[0]
    readLocalFile(file)
    return false
  })
})
