import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {FilmDetails} from './FilmDetails';
import {TOTAL_FRAMES,FPS} from './details-timeline.mjs';
registerRoot(()=><>
 <Composition id="DetailsStandard" component={FilmDetails} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1440}/>
 <Composition id="DetailsWide" component={FilmDetails} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080}/>
</>);
