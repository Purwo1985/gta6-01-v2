// CINDER FALLS — three: the single doorway to the vendored three.js
// build. index.html loads that build as a plain classic script, so the
// library hangs off the window; every game module asks for it here
// instead of reaching for the global itself. When the vendor script
// never arrived, fail at boot with a message a player can actually act
// on, instead of letting the first module that touches the library die
// mid-sentence.
function requireThree() {
  const lib = window.THREE;
  if (!lib) {
    throw new Error('three.js failed to load — check game/vendor/three.min.js');
  }
  return lib;
}

export const THREE = requireThree();
