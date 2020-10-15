import { html, Component, render, useState, useEffect } from './standalone.module.js'

window._mockStorage = {}

const mockStorage = {
  set: (updater, callback) => {
    Object.keys(updater).forEach(key => _mockStorage[key] = updater[key])
    callback()
  },
  get: (keys, callback) => {
    const result = {}
    keys.forEach(key => result[key] = _mockStorage[key])
    callback(result)
  }
}

const storage = chrome.storage ? chrome.storage.sync : mockStorage


const App = () => {
  const [isAdding, setIsAdding] = useState(false)
  const [fields, setFields] = useState([])
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState('string')
  const [isRequired, setIsRequired] = useState(true)
  const [webhook, setWebhook] = useState('')
  const [currentWebhook, setCurrentWebhook] = useState('')

  useEffect(() => {
    storage.get(['fields'], result =>
      setFields(result.fields || [])
    )
    storage.get(['webhook'], result =>
      setWebhook(result.webhook || '')
    )
  }, [])

  const resetField = () => {
    setFieldName('')
    setFieldName(true)
    setFieldType('string')
    setIsAdding(false)
  }
  const resetWebhook = () => {
    setWebhook(currentWebhook)
  }

  return html`
    <div class="app">
      <header>
        <img src="images/icon.png" />
        <div class="title">Dejapaw</div>
      </header>
      <h3>Webhook Setting</h3>
      <div class="pure-form">
        <fieldset>
          <input
            type="text"
            placeholder="Full URL"
            value=${webhook}
            onKeyup=${e => setWebhook(e.target.value)}
          />
          <span class="spacer" />
          <button
            class="pure-button"
            onClick=${resetWebhook}
            disabled=${webhook === currentWebhook}
          >
            Reset
          </button>
          <span class="spacer" />
          <button
            class="pure-button pure-button-primary"
            onClick=${() => {
              storage.set({webhook: webhook}, () => setCurrentWebhook(webhook))
            }}
            disabled=${webhook === currentWebhook}
          >
            Save
          </button>
        </fieldset>
      </div>

      <h3>Manage Your Fields List</h3>
      <table class="pure-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${(fields || []).map((f, index) =>
            html`
              <tr>
                 <td style=${{minWidth: 120}}>${f.name}</td>
                 <td>${f.type}</td>
                 <td>${f.isRequired ? '√' : '×'}</td>
                 <td style=${{width: 120}}>
                  <a
                    class="action"
                    onClick=${() => {
                      const newFields = [...fields]
                      newFields.splice(index, 1)
                      storage.set({fields: newFields}, () => {
                        setFields(newFields)
                      })
                    }}
                  >
                    delete
                  </a>
                </td>
              </tr>
            `
          )}
        </tbody>
      </table>
      <br/>
      ${isAdding ?
        html`
          <div class="pure-form fields">
              <input
                type="text"
                placeholder="Field Name"
                value=${fieldName}
                onKeyup=${e => setFieldName(e.target.value)}
                width="80"
              />
              <span class="spacer" />
              <select
                value=${fieldType}
                onChange=${e => setFieldType(e.target.value)}
              >
                <option value="image">Image</option>
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="clipboard">Clipboard</option>
              </select>
              <span class="spacer" />
              <div class="checkbox-label">
                <input type="checkbox"
                  checked=${isRequired}
                  id="required"
                  onClick=${() => setIsRequired(!isRequired)}
                />
                <label for="required" id="label">required</label>
              </div>
              <span class="spacer" />
              <button
                class="pure-button"
                onClick=${resetField}
              >
                Cancel
              </button>
              <span class="spacer" />
              <button
                class="pure-button pure-button-primary"
                onClick=${() => {
                  const newFields = [...fields, {name: fieldName, type: fieldType, isRequired}]
                  storage.set({fields: newFields}, () => {
                    resetField()
                    setIsAdding(false)
                    setFields(newFields)
                  })
                }}
                disabled=${!fieldName || !fieldType || (fields || []).filter(f => f.name === fieldName).length > 0}
              >
                Save
              </button>
          </div>
        ` : html`
          <button class="pure-button" onClick=${() => setIsAdding(true)}>
            Add Field
          </button>
        `
      }
    </div>
  `
}

render(html`<${App} />`, document.body)

