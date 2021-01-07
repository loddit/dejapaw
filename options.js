import { html, Component, render, useState, useEffect } from './standalone.module.js'

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

const fieldTypes = ['string', 'number', 'image', 'clipboard', 'url', 'currency']

const App = () => {
  const [isAdding, setIsAdding] = useState(false)
  const [fields, setFields] = useState([])
  const [records, setRecords] = useState([])
  const [isCoping, setIsCoping] = useState(false)
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState('string')
  const [isRequired, setIsRequired] = useState(true)
  const [defaultValue, setDefaultValue] = useState('')
  const [webhook, setWebhook] = useState('')
  const [currentWebhook, setCurrentWebhook] = useState('')
  const [isUploadMode, setIsUploadMode] = useState(false)

  useEffect(() => {
    storage.get(['fields'], result =>
      setFields(result.fields || [])
    )
    storage.get(['webhook'], result => {
      setWebhook(result.webhook || '')
      setCurrentWebhook(result.webhook || '')
    })
    storage.get(['records'], result =>
      setRecords(result.records || [])
    )
  }, [])

  const resetField = () => {
    setFieldName('')
    setDefaultValue('')
    setFieldType('string')
    setIsAdding(false)
  }

  const clearWebhook = () => {
    setWebhook('')
  }

  const renderRecordCell = (record, field) => {
    const value = record[field.name]
    switch (field.type) {
      case 'url':
        return value ? html`<a href=${value}>${value}</a>` : '-'
      case 'image':
        return value ? html`<img src=${value} class="record-image" />` : '-'
      default:
        return value
    }
  }

  const clearLocalRecords = () =>
    storage.set({records: []}, () => setRecords([]))

  const renderRecord = (record, index) =>
    html`
      <tr key=${record, index}>
        ${fields.map(f => html`<td key=${f.name} class="record-cell">${renderRecordCell(record, f)}</td>`)}
        <td>
          <a
            class="action"
            onClick=${() => {
              const newRecords = [...records]
              newRecords.splice(index, 1)
              storage.set({records: newRecords}, () => {
                setRecords(newRecords)
              })
            }}
          >
            delete
          </a>
        </td>
      </tr>
    `

  const copyRecordsJSON = () => {
    copyToClipboard(JSON.stringify(records, null, 2))
    setIsCoping(true)
    setTimeout(() => setIsCoping(false), 500)
  }

  const configFieldsFromFile = event => {
    const file = event.target.files[0]
    if (file) {
      var reader = new FileReader()
      reader.addEventListener('load', function() {
        try {
          const newFields = JSON.parse(reader.result)
          if (!Array.isArray(newFields)) {
            throw Error('Wrong JSON data')
          }
          storage.set({fields: newFields}, () => {
            setFields(newFields)
            setIsUploadMode(false)
          })
        } catch (error) {
          alert(error)
        }
      })
      reader.readAsText(file)
    }
  }

  return html`
    <div class="app">
      <header>
        <img src="images/icon.png" />
        <div class="title">Dejapaw</div>
      </header>
      <section>
        <h3>Webhook Setting</h3>
        <div class="pure-form">
          <fieldset>
            <div class="tips">If you leave Webhook Input empty, records will be saved locally.</div>
            <input
              type="text"
              placeholder="Full URL"
              class="webhook"
              value=${webhook}
              onKeyup=${e => setWebhook(e.target.value)}
            />
            <span class="spacer" />
            <button
              class="pure-button"
              onClick=${clearWebhook}
              disabled=${webhook === ''}
            >
              Clear
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
      </section>

      <section>
        <div class="section-title">
          <h3>Local Data</h3>
          <span class="spacer" />
          <div class="tips">${records.length} Records</div>
        </div>
        <table class="pure-table" id="records">
          <thead>
            <tr>
              ${fields.map(f => html`<th key=${f.name}>${f.name}</th>`)}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(renderRecord)}
          </tbody>
        </table>
        <br />
        <div>
          <button disabled=${isCoping} class="pure-button pure-button-primary" onClick=${copyRecordsJSON}>
            ${isCoping ? 'JSON Copyed!' : 'Copy JSON'}
          </button>
          <span class="spacer" />
          <button class="pure-button" onClick=${clearLocalRecords}>
            Clear All
          </button>
        </div>
      </section>


      <div class="section-title">
        <h3>Manage Your Fields List</h3>
        <span class="spacer" />
        ${isUploadMode ? html`
            <div class="pure-form">
              <input type="file" accept=".json" onChange=${configFieldsFromFile}/>
            </div>
          ` : html`
            <button class="pure-button" onClick=${() => setIsUploadMode(true)}>
              Import Config File
            </button>
          `
        }
      </div>
      <table class="pure-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Default Value</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${fields.map((f, index) =>
            html`
              <tr key=${index}>
                 <td style=${{minWidth: 120}}>${f.name}</td>
                 <td>${f.type}</td>
                 <td>${f.isRequired ? '√' : '×'}</td>
                 <td>${f.defaultValue}</td>
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
          <div>
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
              ${fieldTypes.map(ft => html`
                <option value=${ft}>
                  ${ft}
                </option>
              `)}
              </select>
              <span class="spacer" />
              <input
                type="text"
                placeholder="Default Value"
                value=${defaultValue}
                onKeyup=${e => setDefaultValue(e.target.value)}
              />
              <span class="spacer" />
              <div class="checkbox-label">
                <input type="checkbox"
                  checked=${isRequired}
                  id="required"
                  onClick=${() => setIsRequired(!isRequired)}
                />
                <label for="required" id="label">required</label>
              </div>
            </div>
            <div class="pure-form fields">
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
                  const newFields = [...fields, {name: fieldName, type: fieldType, isRequired, defaultValue}]
                  storage.set({fields: newFields}, () => {
                    resetField()
                    setIsAdding(false)
                    setFields(newFields)
                  })
                }}
                disabled=${!fieldName || !fieldType || fields.filter(f => f.name === fieldName).length > 0}
              >
                Save
              </button>
            </div>
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

