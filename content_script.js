(async () => {
  let dejapaw = document.getElementById("dejapaw")
  if (!dejapaw) {
    dejapaw = document.createElement('div')
    dejapaw.setAttribute("id", "dejapaw");
    document.body.appendChild(dejapaw)
  }

  const lang = "en" //(navigator.language || navigator.userLanguage).substr(0, 2)

  const copyToClipboard = str => {
    const el = document.createElement('textarea')
    el.value = str
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }

  function isDescendant(parent, child) {
    var node = child.parentNode
    while (node != null) {
      if (node == parent) {
        return true
      }
      node = node.parentNode
    }
    return false
  }

  const preactUrl = chrome.runtime.getURL("standalone.module.js")
  const logoUrl = chrome.runtime.getURL("images/icon.png")
  const optionsUrl = chrome.runtime.getURL("options.html",)
  const { html, Component, render, useState, useEffect } = await import(preactUrl)

  const storage = chrome.storage.sync

  const placeholderMap = {
    string: "Select Text By Mouse",
    image: "Right Click Image",
    number: "Select Number By Mouse",
    clipboard: "Press Ctrl/Cmd + v",
    currency: "Select A Currency",
    url: "Input A URL(CurrentURL As Default)",
  }

  const CURRENCY_CHINESE_COPY = {
    CNY: '人民币',
    USD: '美元',
    GBP: '英镑',
    TWD: '新台币',
    JPY: '日元',
    HKD: '港币',
    EUR: '欧元',
    CAD: '加元',
    AUD: '澳元',
    KRW: '韩元',
    SGD: '新币',
    INR: '卢比',
    MOP: '澳门元',
  }

  const App = () => {
    const [x, setX] = useState(0)
    const [y, setY] = useState(0)
    const [bottom, setBottom] = useState(20)
    const [right, setRight] = useState(20)
    const [values, setValues] = useState([])
    const [fields, setFields] = useState([])
    const [webhook, setWebhook] = useState('')
    const [records, setRecords] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [error, setError] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [isCoping, setIsCoping] = useState(false)

    useEffect(() => {
      storage.get(['fields'], result => {
        setFields(result.fields || [])
        setValues(
          Array(result.fields.length)
            .fill('')
            .map((_, index) => {
              const field = result.fields[index]
              return field.defaultValue || (field.type === 'url' ? location.href : '')
            })
        )
      })
      storage.get(['webhook'], result => {
        setWebhook(result.webhook || '')
      })

      storage.get(['records'], result => {
        setRecords(result.records || [])
      })

    }, [])

    const setValue = (newValue, index) => {
      const newValues = values.slice()
      newValues[index] = newValue
      setValues(newValues)
    }

    const setCurrentValue = (newValue) => setValue(newValue, currentIndex)

    const isAllRequiredFiledsFilled = fields.length > 0 && fields.map((f, index) => !f.isRequired || !!values[index]).every(Boolean)

    const getEventTypeAndCallbackByFieldType = (type) => {
      switch (type) {
        case 'string':
          return ['mouseup', () => {
            const section = window.getSelection().toString()
            window.getSelection().empty()
            return section
          }]
        case 'image':
          return ['contextmenu', (event) => {
            event.preventDefault()
            event.stopPropagation()
            if (event.target && event.target.tagName === 'IMG') {
              return event.target.currentSrc
            }
          }]
        case 'number':
          return ['mouseup', () => {
            const section = window.getSelection().toString()
            window.getSelection().empty()
            return section ?  parseInt(section.replace(/[^(0-9|.)]/g, ""), 10) : null
          }]
        case 'clipboard':
          return ['paste', (event) => {
            return event.clipboardData.getData('Text')
          }]

        default:
          throw Error('wrong field type')
      }
    }

    useEffect(() => {
      const dragStart = (evnet) => {
        setX(evnet.x)
        setY(evnet.y)
      }
      const dragEnd = (evnet) => {
        setRight(right + (x - event.x))
        setBottom(bottom + (y - event.y))
        setX(0)
        setY(0)
      }
      document.addEventListener('dragstart', dragStart)
      document.addEventListener('dragend', dragEnd)
      return () => {
        document.removeEventListener('dragstart', dragStart)
        document.removeEventListener('dragend', dragEnd)
      }
    }, [x, y, right, bottom])


    const currentField = fields[currentIndex]

    useEffect(() => {
      if (currentField) {
        if (['currency', 'url'].includes(currentField.type)) {
          setCurrentIndex(index => index + 1)
        } else {
          const [eventType, callback] = getEventTypeAndCallbackByFieldType(currentField.type)
          const handler = (event) => {
            const isDejapawEvent = isDescendant(dejapaw, event.target)
            if (!isDejapawEvent) {
              const newValue = callback(event)
              if (newValue) {
                setCurrentValue(newValue)
                setCurrentIndex(index => index + 1)
              }
            }
          }
          window.document.addEventListener(eventType, handler)
          return () => window.document.removeEventListener(eventType, handler)
        }
      }
    }, [fields.length, currentIndex, ...values])

    const onClose = () => render(null, dejapaw)

    const sendData = () => {
      const data = {}
      fields.forEach((field, index) => {
        data[field.name] = values[index] || undefined
      })
      setIsSending(true)
      fetch(webhook, {
        body: JSON.stringify(data),
        cache: 'no-cache',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        referrer: 'no-referrer',
      })
        .catch(error => setError(`Error: ${error}`))
        .then((response) => {
          if (response.ok) {
            setError('')
          } else {
            setError(`Error: ${response.status} ${response.statusText}`)
          }
        }).finally(() => setIsSending(false))
    }

    const saveDataLocally = () => {
      const record = {}
      fields.forEach((field, index) => {
        record[field.name] = values[index] || undefined
      })
      const newRecords = [...records, record]
      storage.set({records: newRecords}, () => {
        setIsSaved(true)
        setRecords(newRecords)
      })
    }

    const isLocalMode = webhook === ''

    const copyRecordsJSON = () => {
      setIsCoping(true)
      copyToClipboard(JSON.stringify(records, null, 2))
      setTimeout(() => setIsCoping(false), 500)
    }

    const clearRecords = () =>
      storage.set({records: []}, () => setRecords([]))

    return html`
      <div id="dejapaw-root" style=${{right, bottom}} draggable="true">
        <div class="dejapaw-head">
          <h2 class="dejapaw-title">Dejapaw Go!</h2>
          <img src=${logoUrl} alt="Logo" class="dejapaw-logo"/>
        </div>
        <br/>
        <ol class="dejapaw-list">
          ${(fields || []).map((f, index) =>
             html`
               <li class="dejapaw-li" key="${index}">
                 <div class="dejapaw-li-header">
                   <div class="dejapaw-li-title">
                     ${f.name}${f.isRequired ?  "*": ''}
                   </div>
                   <div class="dejapaw-li-type">
                     ${f.type}
                   </div>
                   <div>
                     <a class="dejapaw-action" onClick=${() => setCurrentIndex(index + 1)} >
                       pass
                     </a>
                     <a class="dejapaw-action" onClick=${() => setCurrentIndex(index)} >
                       redo
                     </a>
                     <a
                       class="dejapaw-action"
                       onClick=${event => {
                         setValue(null, index)
                       }}
                     >
                       reset
                     </a>
                   </div>
                 </div>
                 ${f.type === 'currency'
                   ? html`<select
                      class="${index === currentIndex ? 'current' : ''}"
                      placeholder="${placeholderMap[f.type]}"
                      value=${values[index]}
                      onChange=${e => setValue(e.target.value, index)}
                     >
                       ${Object.keys(CURRENCY_CHINESE_COPY).map(currencyCode => html`
                        <option key=${currencyCode} value=${currencyCode}>
                          ${lang === 'zh' ? CURRENCY_CHINESE_COPY[currencyCode] : currencyCode}
                        </option>
                       `)}
                     </select>`
                   : html`<input
                     class="${index === currentIndex ? 'current' : ''}"
                     type="text"
                     placeholder="${placeholderMap[f.type]}"
                     value=${values[index]}
                     onKeyUp=${e => {
                       const newValue = e.target.value
                       setValue(f.type === 'number' ? parseInt(newValue, 10) || null : newValue, index)
                     }}
                   />`
                 }
               </li>
               `
          )}
        </ol>
        <div class="dejapaw-footer">
          <div class="dejapaw-tips">
            * Required Field
          </div>
          <button
            class="dejapaw-button"
            onClick=${onClose}
          >
            Close
          </button>
          ${isLocalMode ? (
            html`<button
              class="dejapaw-button"
              onClick=${saveDataLocally}
              disabled=${!isAllRequiredFiledsFilled || isSaved}
            >
              Save
            </button>`
          ) : (
            html`<button
              class="dejapaw-button"
              onClick=${sendData}
              disabled=${!isAllRequiredFiledsFilled || isSending}
            >
              ${isSending ? 'Sending' : 'Send'}
            </button>`
          )}
        </div>
        <div class="dejapaw-error">
          ${error}
        </div>
        ${isLocalMode && html`
          <div class="dejapaw-records">
            <a href=${optionsUrl} target="_blank" class="dejapaw-records-count">
              ${records.length} Records Saved ➔
            </a>
            <button class="dejapaw-button-small" onClick=${copyRecordsJSON}>
              ${isCoping ? 'Copied' : 'Copy'}
            </button>
            <button class="dejapaw-button-small" onClick=${clearRecords}>
              Clear
            </button>
          </div>
        `}
        <style>
          @keyframes slidein {
            from {
              opacity: 0;
              transform: translateX(-200px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          #dejapaw-root *:not(style):not(select) {
            all: initial;
            font-family: FreeSans,Arimo,"Droid Sans",Helvetica,Arial,sans-serif;
          }

          #dejapaw-root {
            position: fixed;
            z-index: 10000;
            padding: 20px;
            border: 1.5px solid #333;
            border-radius: 6px;
            width: 360px;
            background: #fcfcfc;
            font-family: FreeSans,Arimo,"Droid Sans",Helvetica,Arial,sans-serif;
            font-size: 14px;
          }

          #dejapaw-root .dejapaw-li input {
            width: 300px;
            margin-top: 2px;
            border: 1px solid #999;
            border-radius: 4px;
            padding: 3px 6px;
          }

          #dejapaw-root .dejapaw-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          #dejapaw-root .dejapaw-logo {
            width: 36px;
            height: auto;
            margin-right: 6px;
            animation-duration: 0.6s;
            animation-name: slidein;
            cursor: move;
          }

          #dejapaw-root .dejapaw-list {
            padding-inline-start: 0;
          }

          #dejapaw-root .dejapaw-li input.current {
            border: 1px solid red;
          }

          #dejapaw-root .dejapaw-li-header {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
          }

          #dejapaw-root .dejapaw-title {
            margin: 0;
            font-size: 32px;
            font-weight: 600;
          }

          #dejapaw-root .dejapaw-li-title {
            font-size: 16px;
            font-weight: 600;
          }

          #dejapaw-root .dejapaw-li-type {
            font-size: 14px;
            color: #999;
            flex-grow: 1;
            margin-left: 6px;
          }

          #dejapaw-root .dejapaw-action {
            color: #999;
            cursor: pointer;
            margin: 0 3px;
          }

          #dejapaw-root .dejapaw-action:hover {
            color: #666;
          }

          #dejapaw-root .dejapaw-footer {
            margin-top: 12px;
            display: flex;
          }

          #dejapaw-root .dejapaw-error {
            margin-top: 4px;
            color: red;
          }

          #dejapaw-root .dejapaw-tips {
            flex-grow: 1;
            font-size: 13px;
            font-weight: 600;
          }

          #dejapaw-root .dejapaw-button {
            color: #fff;
            background: #000;
            padding: 4px 6px;
            border-radius: 4px;
            margin-left: 6px;
            cursor: pointer;
          }

          #dejapaw-root .dejapaw-button-small {
            color: #fff;
            background: #666;
            padding: 3px 5px;
            font-size: 13px;
            border-radius: 4px;
            margin-left: 4px;
            cursor: pointer;
          }

          #dejapaw-root .dejapaw-button:disabled {
            background: #aaa;
            color: #eee;
          }

          #dejapaw-root .dejapaw-records {
            margin-top: 12px;
            border-top: 1px solid #ccc;
            padding-top: 6px;
            display: flex;
            align-items: center;
          }

          #dejapaw-root .dejapaw-records-count {
            cursor: pointer;
            flex-grow: 1;
          }

          #dejapaw-root .dejapaw-records-count:hover {
            text-decoration: underline;
          }
        </style>
      </div>
    `
  }

  render(html`<${App} />`, dejapaw)
})()

