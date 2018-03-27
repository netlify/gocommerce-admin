import get from 'lodash/get'
import isArray from 'lodash/isArray'
import moment from 'moment'

const requiresShipping = order => {
  const items = isArray(order) ? order : (get(order, 'line_items') || [])
  return !!items.filter(i => i.type === 'Book')[0]
}

export { requiresShipping }


const formatDateInterval = (startDate, endDate) => {
  let interval = null
  if (startDate && endDate) {
    interval = startDate.format('DD/MM/YY') + '–' + endDate.format('DD/MM/YY')

    if (startDate.isSame(endDate, 'year')) {
      interval = startDate.format('MMM DD') + '–' + endDate.format('MMM DD, YYYY')
      if (startDate.isSame(endDate, 'month')) {
        interval = startDate.format('MMM DD') + '–' + endDate.format('DD, YYYY')
        if (startDate.isSame(endDate, 'day')) {
          interval = startDate.format('MMM DD, YYYY')
        }
      }
      if (endDate.isSame(moment(), 'year')) interval = interval.replace(endDate.format(', YYYY'), '')
    }
  }

  return interval
}

export { formatDateInterval }
