import { logger } from 'log-instance/index.mjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthorsV2, SuttaRef } from 'scv-esm/main.mjs';
import { 
  DBG_ADD_CARD, DBG_CLICK, DBG_FOCUS, DBG_MOUNTED,
  DBG_OPEN_CARD, DBG_ROUTE, DBG_SCROLL, DBG_CARD_PATH,
  DBG_VERBOSE, DBG_VIEWPORT, 
} from './defines.mjs';

const CONTEXT_WIKI = "wiki";
const CONTEXT_SEARCH = "search";
const CONTEXT_SUTTA = "sutta";
const CONTEXT_DEBUG = "debug";
const CONTEXTS = {
  [CONTEXT_WIKI]: {
    icon: "mdi-wikipedia",
  },
  [CONTEXT_SEARCH]: {
    icon: "mdi-magnify",
  },
  [CONTEXT_SUTTA]: {
    icon: "mdi-file-document-outline",
  },
  [CONTEXT_DEBUG]: {
    icon: "mdi-tools",
  },
}

export default class EbtCard {
  constructor(opts = {}) {
    let msg = 'ebt-card.ctor() ';
    let dbg = DBG_ADD_CARD;
    let {
      id,
      context,
      location=[],
      isOpen,
      data = undefined,
      langTrans, // factory prop
    } = opts;

    if (context == null || context === '') {
      context = CONTEXT_WIKI;
    }
    context = context.toLowerCase();
    if (id == null) {
      id = context===CONTEXT_WIKI 
        ? 'home-card-id' 
        : uuidv4().split('-').pop();
    }

    if (typeof location === 'string') {
      location = [location];
    }
    if (!(location instanceof Array)) {
      throw new Error('Expected location array');
    }
    let contextLoc = [context, ...location].join('/');
    switch (context) {
      case CONTEXT_WIKI:
        isOpen = isOpen === undefined ? false : isOpen;
        dbg && console.log(msg, `[1]${context}`, {isOpen, contextLoc});
        break;
      case CONTEXT_DEBUG: 
        if (location[0] == null) {
          location[0] = 'Debug';
          dbg && console.log(msg, `[2]${context}`, location);
        }
        break;
      case CONTEXT_SEARCH:
        if (location[0] == null) {
          location[0] = '';
        }
        if (location.length === 1) {
          dbg && console.log(msg, `[3]${context}`, {langTrans});
          langTrans && location.push(langTrans);
        }
        break;
      case CONTEXT_SUTTA:
        dbg && console.log(msg, `[4]${context} before`, location);
        location[1] == null && (location[1] = langTrans);
        location[2] == null && 
          (location[2] = AuthorsV2.langAuthor(location[1]));
        dbg && console.log(msg, `[4]${context} after`, location);
        break;
    }

    Object.assign(this, {// primary properties
      id,
      location,
      context,
      data,
      isOpen: isOpen === undefined ? true : isOpen,
    });

    // secondary properties

    //logger.info(msg, `${context} ${id} ${location[0]}`);
  }

  static get CONTEXT_WIKI() { return CONTEXT_WIKI; }
  static get CONTEXT_SEARCH() { return CONTEXT_SEARCH; }
  static get CONTEXT_SUTTA() { return CONTEXT_SUTTA; }
  static get CONTEXT_DEBUG() { return CONTEXT_DEBUG; }

  static routeSuttaRef(route, langTrans='en') {
    const msg = 'ebt-card.routeSuttaRef() ';
    let routeParts = route.split('#/sutta');
    //console.log(msg, {route, langTrans, routeParts});
    if (routeParts.length !== 2) {
      return null;
    }
    let refStr = routeParts[1].slice(1);
    return SuttaRef.create(refStr, langTrans)
  }

  static pathToCard(args) {
    const msg = 'ebt-card.pathToCard()';
    const dbg = DBG_CARD_PATH;
    let {
      path='/', cards=[], addCard, defaultLang, isOpen,
    } = args;
    path = path.replace(/^.*\/#/, ''); // ignore non-hash part of path
    let [ ignored, context, ...location ] = path.split('/');
    location = location.map(loc => decodeURIComponent(loc));
    let card = cards.find(card => card.matchPath({path, defaultLang}));
    dbg && console.log(msg, '[1]find', {card, path});
    if (card == null) {
      if (addCard === undefined) {
        throw new Error(msg+"addCard is required");
      } 
      if (context) {
        dbg && console.log(msg, '[2]addCard', 
          {context,location,isOpen});
        card = addCard ? addCard({context, location, isOpen}) : null;
      }
    } else {
      dbg && console.log(msg, '[3]existing', card.debugString);
    } 

    if (card) {
      switch (card.context) {
        case CONTEXT_WIKI: {
          let newLocation = path.split('/').slice(2);
          if (newLocation.length) {
            card.location = newLocation;
            dbg && console.log(msg, '[4]newLocation', card.debugString, 
              newLocation);
          }
        } break;
        case CONTEXT_SUTTA: {
          if (location[0].indexOf(':') >= 0) { // different scid
            dbg && console.log(msg, '[5]location', card.debugString, 
              location[0]);
            card.location[0] = location[0];
          }
        } break;
      }
    }

    return card;
  }

  get tab1Id() {
    return `${this.id}-tab1`;
  }

  get containerId() {
    return `${this.id}-container`;
  }

  get deleteId() {
    return `${this.id}-delete`;
  }

  get autofocusId() {
    return `${this.id}-autofocus`;
  }

  get icon() {
    return CONTEXTS[this.context]?.icon || "mdi-alert-icon";
  }

  get topAnchor() {
    return `${this.id}-top`;
  }

  get titleAnchor() {
    return `${this.id}-title`;
  }

  get currentElementId() {
    const msg = "ebt-data.currentElementId()";
    const dbg = DBG_CLICK;
    let { titleAnchor, tab1Id, deleteId, context, location } = this;
    let aeId = document?.activeElement?.id;
    switch (context) {
      case CONTEXT_SUTTA:
        //if (aeId === tab1Id || aeId === deleteId) {
          //dbg && console.log(msg, aeId);
          //return titleAnchor;
        //}

        return location.length>0 && location[0].includes(':')
          ? this.segmentElementId()
          : titleAnchor;
      default:
        return this.titleAnchor;
    }
  }

  get debugString() {
    let { isOpen, id, context, location} = this;
    let separator = isOpen ? '+' : '-';
    return `${id}${separator}${context}`;
  }

  hasFocus(appFocus) {
    const msg = "ebt-card.hasFocus()";
    const dbg = DBG_FOCUS && DBG_VERBOSE;
    let { containerId } = this;
    let hasFocus = false;
    for (let elt=appFocus; elt; elt=elt.parentElement) {
      if (elt.id === containerId) {
        hasFocus = true;
        break;
      }
    }
    dbg && console.log(msg, '[1] =>', hasFocus);
    return hasFocus;
  }

  open(value=true) {
    const msg = 'ebt-card.open()';
    const dbg = DBG_OPEN_CARD;
    let { isOpen, debugString, } = this;

    if (isOpen === value) {
      dbg && console.log(msg, `[1]isOpen`, debugString);
      return false;
    }

    dbg && console.log(msg, `[2]isOpen<=${value}`, debugString);
    this.isOpen = value;
    return true;
  }

  onAfterMounted({settings, volatile}) {
    const msg = "ebt-card.onAfterMounted()";
    const dbg = DBG_ROUTE || DBG_MOUNTED;
    let { langTrans, } = settings;
    let { id } = this;
    let route = window.location.hash.split('#')[1] || '';
    if (this.matchPath({path:route, defaultLang:langTrans})) {
      let aeId = document?.activeElement?.id;
      if (volatile.routeCard?.id !== id) {
        dbg && console.log(msg, `[1]setRouteCard`, this.debugString);
        volatile.setRouteCard(this);
      }
      dbg && console.log(msg, `[2]focusCardElementId ${id}`, 
        {route, aeId});
      volatile.focusCardElementId(this, route);
    }
  }

  routeHash(dstPath) {
    let { context, location } = this;
    switch (context) {
      case CONTEXT_SEARCH:
        return location.reduce((a,v) => {
          return `${a}/${encodeURIComponent(v)}`;
        }, `#/${context}`);
        
      case CONTEXT_SUTTA: 
        if (dstPath) {
          let [ 
            ignored, ctx, suttaSeg, lang, author 
          ] =  dstPath.split('/');
          location[0] = suttaSeg;
        }
        let [ suttaSeg, lang, author ] = location;
        // NOTE: See segmentElementId()
        return `#/sutta/${suttaSeg}/${lang}/${author}`;
      default:
        return location.reduce((a,v) => {
          return `${a}/${encodeURIComponent(v)}`;
        }, `#/${context}`);
    }
  }

  chipTitle($t=((k)=>k)) {
    let { location, context } = this;
    if (location.length) {
      if (context === CONTEXT_SEARCH) {
        return location[0];
      }
      return location.join('/');
    }
    return $t(`ebt.no-location-${context}`);
  }

  matchPathSutta({opts, context, location, cardLocation, }) {
    const msg = "ebt-card.matchPathSutta()";
    const dbg = DBG_ROUTE && DBG_VERBOSE;
    let { path, defaultLang } = opts;
    let loc = location.join('/');
    let cardLoc = cardLocation.join('/');
    if (loc === '') {
      let result = cardLoc === loc;
      dbg && console.log(msg, `[1]true ${path} => ${result}`, 
        {cardLoc, loc});
      return result;
    }
    if (cardLoc === '') {
      dbg && console.log(msg, `[2]false  ${path}`, {cardLoc, loc});
      return false;
    }
    let msStart = Date.now();
    let pathRef = SuttaRef.create(loc, defaultLang);
    if (pathRef == null) {
      dbg && console.log(msg, `[3]false (${path})`, {loc});
      return false;
    }
    let cardRef = SuttaRef.create(cardLoc, defaultLang);
    if (pathRef.sutta_uid !== cardRef.sutta_uid) {
      dbg && console.log(msg, `[4]false (${path})`, 
        pathRef.suid, cardRef.suid);
      return false;
    }
    if (pathRef.lang && pathRef.lang !== cardRef.lang) {
      dbg && console.log(msg, `[5]false (${path}, ${defaultLang})`, 
        pathRef.lang, cardRef.lang);
      return false;
    }
    if (pathRef.author && pathRef.author !== cardRef.author) {
      dbg && console.log(msg, `[6]false (${path})`, 
        pathRef.author, cardRef.author);
      return false;
    }

    dbg && console.log(`[7]match(${path})`, 
      pathRef.toString(), '~=', cardRef.toString());
    return true;
  }

  matchPath(strOrObj) {
    const msg = 'ebt-card.matchPath() ';
    const dbg = DBG_CARD_PATH;
    let opts = typeof strOrObj === 'string'
      ? { path: strOrObj }
      : strOrObj;
    let { path } = opts;
    path = path.toLowerCase().replace(/^#/, '');
    let [ blank, context="", ...location ] = path.split('/');
    if (blank !== '') {
      dbg && console.log(msg, `[1] (${path}) expected initial "/"`, 
        {blank});
      return false;
    }
    while (location.length && location[location.length-1] === '') {
      location.pop();
    }
    context = context && context.toLowerCase();
    if (context === this.context && context===CONTEXT_WIKI) {
      // all wiki locations are owned by home card singleton
      dbg && console.log(msg, '[2]CONTEXT_WIKI', strOrObj, this);
      return true;
    }
    location = location 
      ? location.map(loc => loc && decodeURIComponent(loc.toLowerCase())) 
      : [];

    let cardLocation = this.location instanceof Array 
      ? this.location
      : (this.location == null ? [] : [this.location]);
    if (context !== this.context) {
      dbg && console.log(msg, 
        `[3](${path}) context ${context} != ${this.context}`);
      return false;
    }
    if (context === CONTEXT_SUTTA) {
      return this.matchPathSutta({opts, context, location, cardLocation});
    }
    if (location.length !== cardLocation.length) {
      if (context === CONTEXT_SEARCH) {
        if (location.length === 0) {
          location.push('');
        }
        if (cardLocation[0] === location[0] && location.length<2) {
          return true; // empty search path without langTrans
        }
      }
      dbg && console.log(msg, [
        '[4]',
        path,
        `location:${JSON.stringify(location)}`,
        `!=`,
        `cardLocation:${JSON.stringify(cardLocation)}`].join(' '));
      return false;
    }
    let match = location.reduce((a,v,i) => {
      let vDecoded = decodeURIComponent(v.toLowerCase());
      let match = a && (vDecoded === cardLocation[i].toLowerCase());
      if (dbg && !match) {
        dbg && console.log(msg, `[5](${path}) location[${i}]`,
          `${location[i]} != ${cardLocation[i]}`);
      }
      return match;
    }, true);

    dbg && console.log(msg, `[6](${path}) => ${match}`, 
      {context, location});
    return match;
  }

  nextLocation({segments, delta=1}) {
    let { context } = this;
    let [...location] = this.location;

    if (context === CONTEXT_SUTTA) {
      let [ scid, lang, author ] = location;
      let iSeg = segments.findIndex(seg=>seg.scid === scid);
      if (iSeg < 0) {
        iSeg = 0;
      }
      let iSegNext = iSeg + delta;
      if (iSeg<0 || iSegNext<0 || segments.length<=iSegNext) {
        logger.debug("next segment out of bounds", {iSeg, iSegNext, delta});
        return null;
      }
      location[0] = segments[iSegNext].scid;
      return {
        location,
        iSegment: iSegNext,
      };
    }
  }

  incrementLocation({segments, delta=1}) {
    let { context } = this;
    let result = this.nextLocation({segments, delta});

    if (result) {
      let { location:nextLocation, iSegment } = result;

      if (this.location.join('/') !== nextLocation.join('/')) {
        this.location = nextLocation;
      }
    }

    return result;
  }

  setLocation({segments, delta=0}) {
    const msg = 'ebt-card.setLocation() ';
    let { context } = this;
    let [...newLocation] = this.location;

    let result = null;
    if (context === CONTEXT_SUTTA) {
      if (segments.length <= 0) {
        //logger.info(msg, "no segments");
        return result;
      }
      let iSegNext = delta >= 0 ? delta : segments.length+delta;
      newLocation[0] = segments[iSegNext].scid;

      if (this.location.join('/') !== newLocation.join('/')) {
        this.location = newLocation;
        result = {
          location: newLocation,
          iSegment: iSegNext,
        };
      }
    }
    return result;
  }

  segGroup(scid) {
    let segnum = scid.split(':')[1];
    return segnum.split('.')[0];
  }

  groupStartIndex({segments=[], iSegCur=0}) {
    const msg = 'ebt-card.groupStartIndex() ';
    let { context, } = this;

    if (context !== CONTEXT_SUTTA || segments.length <= 0) {
      return 0;
    }

    let scid = segments[iSegCur].scid;
    let curGroup = this.segGroup(scid);
    iSegCur = iSegCur < 0 ? 0 : iSegCur;
    let iSegPrev = iSegCur;
    let iSegNext = Math.min(segments.length-1, Math.max(0, iSegPrev-1));
    let nextScid = segments[iSegNext].scid;
    let nextGroup = this.segGroup(nextScid);
    while (iSegPrev !== iSegNext && curGroup === nextGroup) {
      iSegPrev = iSegNext;
      iSegNext = Math.min(segments.length-1, Math.max(0, iSegPrev-1));
      nextScid = segments[iSegNext].scid;
      nextGroup = this.segGroup(nextScid);
    }
    return iSegPrev;
  }

  incrementGroup({segments=[], delta=1}) {
    const msg = 'ebt-card.incrementGroup() ';
    let result = null;
    let { context } = this;
    let [...location] = this.location;

    if (context !== CONTEXT_SUTTA || segments.length <= 0) {
      return result;
    }

    let scid = this.location[0];
    let curGroup = this.segGroup(scid);
    let iSegCur = segments.findIndex(seg=>seg.scid === scid);
    iSegCur = iSegCur < 0 ? 0 : iSegCur;
    let iSegPrev = iSegCur;
    let iSegNext = Math.min(segments.length-1, 
      Math.max(0, iSegPrev+delta));
    let iSegment = iSegNext;

    if (delta < 0) {
      iSegment = this.groupStartIndex({segments, iSegCur});
      if (iSegment === iSegCur) {
        iSegment = this.groupStartIndex({segments, iSegCur: iSegNext});
      }
      if (iSegment !== iSegCur) {
        location[0] = segments[iSegment].scid;
        result = { location, iSegment }
      }
    }

    while (result == null && iSegPrev !== iSegment) {
      let nextScid = segments[iSegment].scid;
      let nextGroup = this.segGroup(nextScid);
      if (nextGroup !== curGroup) {
        location[0] = nextScid;
        result = { location, iSegment };
        break;
      }
      iSegPrev = iSegment;
      iSegment = Math.min(segments.length-1, Math.max(0, iSegPrev+delta));
    }

    if (result) {
      this.location = result.location;
    }

    return result;
  }

  segmentElementId(scid) {
    let { id, context, location } = this;
    if (context !== CONTEXT_SUTTA) {
      scid = scid || 'no-segment';
      return `${id}:${scid}`;
    }

    scid = scid || location[0];

    let [ ignore, lang, author ] = location;

    // NOTE: routeHash() and segmentElementId() must differ
    // to prevent the browser from auto-navigating
    // to segmentElementId's when the route changes
    return `seg-${scid}/${lang}/${author}`;
  }

  /* HACK:
   * The viewport element is obscurable by the app bar
   * and is above the viewed element by the height of the app bar.
   * Therefore the viewed element will always be viewable if the
   * viewport element is within the top half of the viewport.
   * The focus element may or may not be the viewed element
   */
  viewportElement(focusElt) {
    const msg = 'ebt-card.viewportElement';
    const dbg = DBG_VIEWPORT;
    let focusId = focusElt?.id;
    let viewportId = focusId;
    let { 
      autofocusId, context, topAnchor, tab1Id, deleteId, location
    } = this;

    if (focusId === tab1Id) {
      viewportId = topAnchor;
    } else if (focusId === deleteId) {
      viewportId = deleteId;
    } else if (focusId === autofocusId) {
      switch (context) {
        case EbtCard.CONTEXT_SUTTA: {
          let [ scid, lang, author ] = location;
          viewportId = this.segmentElementId(scid);
        } break;
      }
    }

    let viewportElt = document.getElementById(viewportId) || focusElt;
    dbg && console.log(msg, '[1]', viewportElt?.id);
    return viewportElt;
  }

}


