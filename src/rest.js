import _ from 'lodash/fp'
import pathToRegexp from 'path-to-regexp'

const mapKey = _.map.convert({ cap: false })

const generateReq = (root, defaultOptions) => async (uri, options) => {
  const res = await fetch(
    root + uri,
    _.mergeAll([
      options,
      defaultOptions,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      },
    ]),
  )
  return res.json()
}

const generateMethod = (req, method, path) => {
  if (pathToRegexp.parse(path).length > 1) {
    const toPath = pathToRegexp.compile(path)
    return (pathParams, body) => {
      if (!pathParams) throw new Error('Missing path params')
      else if (method !== 'GET' && method !== 'DELETE' && !body) throw new Error('Missing body')
      return req(toPath(pathParams), { method, body })
    }
  } else {
    return (body) => {
      return req(path, { method, body })
    }
  }
}

export default function prepare ({
  root,
  endpoints,
  defaultOptions = {},
  processResult = _.identity,
}) {
  const req = generateReq(root, defaultOptions)

  const methods =
    endpoints
    |> mapKey((paths, method) => paths |> _.mapValues((path) => generateMethod(req, method, path)))
    |> _.mergeAll

  function install (Vue) {
    Object.defineProperty(Vue.prototype, '$methods', {
      get () {
        return methods
      },
    })

    Vue.mixin({
      data: () => ({
        $rest: {
          loading: false,
        },
      }),

      created () {
        init.call(this, processResult)
      },
    })
  }

  return { methods, install }
}

function init (processResult) {
  let rest = this.$options.rest
  if (!rest) return

  Object.defineProperty(this, '$rest', {
    get: () => this.$data.$rest,
    enumerable: true,
    configurable: true,
  })

  rest
    |> _.keys
    |> _.forEach((key) => {
      this.$set(this.$rest, key, null)
    })
  this.$rest.loading = true

  const reqOpts =
    rest
    |> _.values
    |> _.map((val) => {
      if (_.isFunction(val)) val = val.call(this)
      if (_.isArray(val)) return { name: val[0], opts: val[1] }
      return { name: val }
    })

  const reqs = reqOpts |> _.map(({ name, opts }) => this.$methods[name](opts))
  Promise.all(reqs).then((res) => {
    res
      |> _.zip(rest |> _.keys)
      |> _.zip(reqOpts |> _.map('name'))
      |> _.forEach(([name, [key, result]]) => {
        this.$rest[key] = processResult(result, name)
      })
    this.$rest.loading = false
  })
}
