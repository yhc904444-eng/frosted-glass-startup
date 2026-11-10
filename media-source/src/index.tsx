import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {PrintFilm} from './PrintFilm';
import {DURATION_FRAMES, FPS} from './timing';

const Root = () => <Composition id="PrintWide" component={PrintFilm} width={1920} height={1080} fps={FPS} durationInFrames={DURATION_FRAMES}/>;
registerRoot(Root);
