import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {FilmEN} from './FilmEN';
registerRoot(()=><>
 <Composition id="StartupStandard" component={FilmEN} durationInFrames={960} fps={30} width={1920} height={1440}/>
 <Composition id="StartupWide" component={FilmEN} durationInFrames={960} fps={30} width={1920} height={1080}/>
</>);
