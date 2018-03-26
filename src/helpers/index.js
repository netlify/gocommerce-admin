import get from 'lodash/get'
import isArray from 'lodash/isArray'

const requiresShipping = order => {
  const items = isArray(order) ? order : (get(order, 'line_items') || [])
  return !!items.filter(i => i.type === 'Book')[0]
}

export { requiresShipping }
