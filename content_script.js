(async () => {
  let dejapaw = document.getElementById("dejapaw")
  if (!dejapaw) {
    dejapaw = document.createElement('div')
    dejapaw.setAttribute("id", "dejapaw");
    document.body.appendChild(dejapaw)
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
  const { html, Component, render, useState, useEffect } = await import(preactUrl)

  const storage = chrome.storage.sync

  const placeholderMap = {
    string: "Select Text By Mouse",
    image: "Right Click Image",
    number: "Select Number By Mouse",
    clipboard: "Press Ctrl/Cmd + v"
  }

  const App = () => {
    const [x, setX] = useState(0)
    const [y, setY] = useState(0)
    const [bottom, setBottom] = useState(20)
    const [right, setRight] = useState(20)
    const [values, setValues] = useState([])
    const [fields, setFields] = useState([])
    const [webhook, setWebhook] = useState('')
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
      storage.get(['fields'], result => {
        setFields(result.fields || [])
        setValues(Array(result.fields.length).fill(''))
      })
    }, [])

    const setValue = (newValue, index) => {
      const newValues = values.slice()
      newValues[index] = newValue
      setValues(newValues)
    }

    const setCurrentValue = (newValue) => setValue(newValue, currentIndex)

    const isAllRequiredFiledsFilled = fields.length > 0 && fields.map((f, index) => !f.isRequired || !!values[index]).every(Boolean)

    getEventTypeAndCallbackByFieldType = (type) => {
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

    useEffect(() => {
      if (fields[currentIndex]) {
        const [eventType, callback] = getEventTypeAndCallbackByFieldType(fields[currentIndex].type)
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
    }, [fields.length, currentIndex])

    return html`
      <div id="dejapaw-root" style=${{right, bottom}} draggable="true">
        <div class="dejapaw-head">
          <h2 class="dejapaw-title">Dejapaw Go!</h2>
          <img src=${logoUrl} alt="Logo" class="dejapaw-logo"/>
        </div>
        <br/>
        <ol>
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
                 <input
                   class="${index === currentIndex ? 'current' : ''}"
                   type="text"
                   placeholder="${placeholderMap[f.type]}"
                   value=${values[index]}
                   onKeyUp=${e => setValue(e.target.value, index)}
                 />
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
            onClick=${() =>
              render(null, dejapaw)
            }
          >
            Close
          </button>
          <button
            class="dejapaw-button"
            onClick=${() => console.log(1)}
            disabled=${!isAllRequiredFiledsFilled}
          >
            Send
          </button>
        </div>
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

          #dejapaw-root {
            position: fixed;
            z-index: 10000;
            padding: 20px;
            border: 1px solid #333;
            border-radius: 6px;
            width: 280px;
            background: #fcfcfc;
            font-family: FreeSans,Arimo,"Droid Sans",Helvetica,Arial,sans-serif;
            font-size: 14px;
          }

          #dejapaw-root .dejapaw-li input {
            margin-top: 2px;
            border: 1px solid #999;
            border-radius: 4px;
          }

          .dejapaw-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .dejapaw-logo {
            width: 36px;
            height: auto;
            margin-right: 6px;
            animation-duration: 0.6s;
            animation-name: slidein;
          }

          #dejapaw-root .dejapaw-li input.current {
            border: 1px solid red;
          }

          .dejapaw-li-header {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
          }

          .dejapaw-li-title {
            font-size: 16px;
            font-weight: 600;
          }

          .dejapaw-li-type {
            font-size: 14px;
            color: #999;
            flex-grow: 1;
            margin-left: 6px;
          }

          .dejapaw-action {
            color: #999;
            cursor: pointer;
            margin: 0 3px;
          }

          .dejapaw-action:hover {
            color: #666;
          }

          .dejapaw-footer {
            margin-top: 12px;
            display: flex;
          }

          .dejapaw-tips {
            flex-grow: 1;
            font-size: 13px;
            font-weight: 600;
          }

          .dejapaw-button {
            color: #fff;
            background: #000;
            padding: 4px 6px;
            border-radius: 4px;
            margin-left: 6px;
          }

          .dejapaw-button:disabled {
            background: #aaa;
            color: #eee;
          }
        </style>
      </div>
    `
  }

  render(html`<${App} />`, dejapaw)
})()

