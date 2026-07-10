(() => {
  const data = window.cameraGuideData;
  if (!data) return;

  const body = document.body;
  const state = {
    camera: 'film',
    part: data.parts.film.defaultPart,
    mode: 'Auto',
    flow: 'film',
    scenario: 'portrait'
  };
  const DIAL_LAYOUT = {
    smallViewport: 720,
    mediumViewport: 980,
    smallSize: 360,
    mediumSize: 520,
    largeSize: 620,
    radiusRatio: 0.38
  };
  const EXPOSURE_TUNING = {
    minBlur: 4,
    maxBlur: 24,
    apertureDivisor: 0.8,
    motionReference: 2,
    motionStep: 7,
    maxBrightness: 1.25,
    baseBrightness: 0.72,
    apertureReference: 16,
    apertureWeight: 0.16,
    isoBrightnessDivisor: 6400,
    maxNoise: 0.35,
    noiseDivisor: 9600
  };

  const partName = document.getElementById('part-name');
  const partSummary = document.getElementById('part-summary');
  const partRole = document.getElementById('part-role');
  const partImpact = document.getElementById('part-impact');
  const panelTypeLabel = document.getElementById('panel-type-label');
  const hotspotButtons = [...document.querySelectorAll('.hotspot')];
  const partElements = [...document.querySelectorAll('.camera-part')];
  const compareGrid = document.getElementById('compare-grid');
  const modeDial = document.getElementById('mode-dial');
  const modeTitleMini = document.getElementById('mode-title-mini');
  const modeName = document.getElementById('mode-name');
  const modeSummary = document.getElementById('mode-summary');
  const modeControl = document.getElementById('mode-control');
  const modeUsage = document.getElementById('mode-usage');
  const modeTip = document.getElementById('mode-tip');
  const flowName = document.getElementById('flow-name');
  const flowSteps = document.getElementById('flow-steps');
  const flowTargetLabel = document.getElementById('flow-target-label');
  const scenarioList = document.getElementById('scenario-list');
  const scenarioMode = document.getElementById('scenario-mode');
  const scenarioName = document.getElementById('scenario-name');
  const scenarioReason = document.getElementById('scenario-reason');
  const scenarioTip = document.getElementById('scenario-tip');
  const apertureRange = document.getElementById('aperture-range');
  const shutterRange = document.getElementById('shutter-range');
  const isoRange = document.getElementById('iso-range');
  const apertureValue = document.getElementById('aperture-value');
  const shutterValue = document.getElementById('shutter-value');
  const isoValue = document.getElementById('iso-value');
  const apertureNote = document.getElementById('aperture-note');
  const shutterNote = document.getElementById('shutter-note');
  const isoNote = document.getElementById('iso-note');
  const previewTitle = document.getElementById('preview-title');
  const previewDescription = document.getElementById('preview-description');

  const shutterOptions = ['1초', '1/30초', '1/125초', '1/500초', '1/2000초'];

  function getDialSize() {
    if (modeDial.clientWidth) return modeDial.clientWidth;
    if (window.innerWidth < DIAL_LAYOUT.smallViewport) return DIAL_LAYOUT.smallSize;
    if (window.innerWidth < DIAL_LAYOUT.mediumViewport) return DIAL_LAYOUT.mediumSize;
    return DIAL_LAYOUT.largeSize;
  }

  function calculateApertureBlur(aperture) {
    return Math.max(EXPOSURE_TUNING.minBlur, EXPOSURE_TUNING.maxBlur - aperture / EXPOSURE_TUNING.apertureDivisor);
  }

  function calculateMotionBlur(shutterIndex) {
    return Math.max(0, (EXPOSURE_TUNING.motionReference - shutterIndex) * EXPOSURE_TUNING.motionStep);
  }

  function calculateBrightness(aperture, iso) {
    const apertureContribution = (EXPOSURE_TUNING.apertureReference / aperture) * EXPOSURE_TUNING.apertureWeight;
    const isoContribution = iso / EXPOSURE_TUNING.isoBrightnessDivisor;
    return Math.min(EXPOSURE_TUNING.maxBrightness, EXPOSURE_TUNING.baseBrightness + apertureContribution + isoContribution);
  }

  function calculateNoiseOpacity(iso) {
    return Math.min(EXPOSURE_TUNING.maxNoise, iso / EXPOSURE_TUNING.noiseDivisor);
  }

  function renderPart() {
    const cameraData = data.parts[state.camera];
    const part = cameraData.items[state.part] || cameraData.items[cameraData.defaultPart];
    partName.textContent = part.name;
    partSummary.textContent = part.summary;
    partRole.textContent = part.role;
    partImpact.textContent = part.impact;
    panelTypeLabel.textContent = cameraData.typeLabel;

    hotspotButtons.forEach((button) => {
      const isMatch = button.dataset.part === state.part;
      button.classList.toggle('active', isMatch);
      if (button.classList.contains('film-only') || button.classList.contains('digital-only')) {
        const visibleForCamera = button.classList.contains(`${state.camera}-only`);
        button.classList.toggle('active-camera', visibleForCamera);
        button.hidden = !visibleForCamera;
        button.disabled = !visibleForCamera;
        button.tabIndex = visibleForCamera ? 0 : -1;
        button.setAttribute('aria-hidden', String(!visibleForCamera));
      } else {
        button.hidden = false;
        button.disabled = false;
      }
    });

    partElements.forEach((element) => {
      element.classList.remove('selected', 'film-highlight');
      const id = element.id.replace('part-', '');
      const isVisibleVariant = !(element.classList.contains('film-only') && state.camera === 'digital') &&
        !(element.classList.contains('digital-only') && state.camera === 'film');
      element.style.display = isVisibleVariant ? '' : 'none';
      if (id === state.part) {
        element.classList.add('selected');
        if (state.camera === 'film' && id === 'film-chamber') {
          element.classList.add('film-highlight');
        }
      }
    });
  }

  function renderComparison() {
    compareGrid.innerHTML = data.comparison.map((item) => `
      <article class="compare-item reveal is-visible">
        <div class="compare-badge ${item.type}">${item.type === 'film' ? '필름 기록' : '디지털 기록'}</div>
        <h3>${item.title}</h3>
        <p>${item.summary}</p>
        <ul class="compare-points">
          ${item.points.map((point) => `<li>${point}</li>`).join('')}
        </ul>
      </article>
    `).join('');
  }

  function renderModes() {
    const dialSize = getDialSize();
    const center = dialSize / 2;
    const radius = dialSize * DIAL_LAYOUT.radiusRatio;
    modeDial.innerHTML = data.modes.map((mode, index) => {
      const angle = ((Math.PI * 2) / data.modes.length) * index;
      const x = center + Math.sin(angle) * radius;
      const y = center - Math.cos(angle) * radius;
      return `<button class="mode-button ${state.mode === mode.key ? 'active' : ''}" type="button" data-mode="${mode.key}" style="left:${x}px; top:${y}px;" aria-label="${mode.name} 보기"><span>${mode.key}</span></button>`;
    }).join('');
    modeDial.querySelectorAll('.mode-button').forEach((button) => {
      button.addEventListener('click', () => {
        state.mode = button.dataset.mode;
        renderModes();
        renderModeCard();
      });
    });
  }

  function renderModeCard() {
    const mode = data.modes.find((item) => item.key === state.mode) || data.modes[0];
    modeTitleMini.textContent = mode.key;
    modeName.textContent = mode.name;
    modeSummary.textContent = mode.summary;
    modeControl.textContent = mode.control;
    modeUsage.textContent = mode.usage;
    modeTip.textContent = mode.tip;
  }

  function renderFlow() {
    const flow = data.flows[state.flow];
    flowName.textContent = flow.title;
    flowTargetLabel.textContent = flow.target;
    flowSteps.innerHTML = flow.steps.map((step) => `<li>${step}</li>`).join('');
    body.dataset.flow = state.flow;
  }

  function renderScenarioButtons() {
    scenarioList.innerHTML = data.scenarios.map((item) => `
      <button class="scenario-btn ${state.scenario === item.key ? 'active' : ''}" type="button" data-scenario="${item.key}" role="option" aria-selected="${state.scenario === item.key}">${item.label}</button>
    `).join('');
    scenarioList.querySelectorAll('.scenario-btn').forEach((button) => {
      button.addEventListener('click', () => {
        state.scenario = button.dataset.scenario;
        renderScenarioButtons();
        renderScenarioCard();
      });
    });
  }

  function renderScenarioCard() {
    const item = data.scenarios.find((scenario) => scenario.key === state.scenario) || data.scenarios[0];
    scenarioMode.textContent = `추천 모드 · ${item.mode}`;
    scenarioName.textContent = item.title;
    scenarioReason.textContent = item.reason;
    scenarioTip.textContent = item.tip;
  }

  function updateExposurePreview() {
    const aperture = Number(apertureRange.value) / 10;
    const shutterIndex = Number(shutterRange.value);
    const iso = Number(isoRange.value);

    const apertureBlur = calculateApertureBlur(aperture);
    const motionBlur = calculateMotionBlur(shutterIndex);
    const brightness = calculateBrightness(aperture, iso);
    const noiseOpacity = calculateNoiseOpacity(iso);

    document.documentElement.style.setProperty('--aperture-blur', `${apertureBlur}px`);
    document.documentElement.style.setProperty('--motion-blur', `${motionBlur}px`);
    document.documentElement.style.setProperty('--brightness', String(brightness));
    document.documentElement.style.setProperty('--noise-opacity', String(noiseOpacity));

    apertureValue.textContent = `F${aperture.toFixed(1)}`;
    shutterValue.textContent = shutterOptions[shutterIndex];
    isoValue.textContent = `ISO ${iso}`;

    apertureNote.textContent = aperture <= 3.5
      ? '조리개가 많이 열려 있어요. 배경이 부드럽게 흐려져서 인물이나 음식이 더 돋보여요.'
      : aperture >= 10
        ? '조리개가 많이 닫혀 있어요. 앞뒤가 더 선명해서 풍경 사진에 잘 어울려요.'
        : '조리개가 중간 정도라서 배경 흐림과 선명함이 균형 있게 보여요.';

    shutterNote.textContent = shutterIndex <= 1
      ? '셔터가 느려서 움직임이 길게 남아요. 야경 궤적이나 물 흐름 표현에 어울려요.'
      : shutterIndex >= 3
        ? '셔터가 빨라서 움직임이 또렷하게 멈춰 보여요. 스포츠나 반려동물 촬영에 좋아요.'
        : '셔터 속도가 무난해서 일상 장면을 편하게 담기 좋아요.';

    isoNote.textContent = iso <= 400
      ? 'ISO가 낮아 사진이 깨끗해 보여요. 대신 빛이 부족하면 더 긴 셔터가 필요할 수 있어요.'
      : iso >= 1600
        ? 'ISO가 높아 어두운 곳에서 밝게 찍기 쉬워요. 대신 거친 노이즈가 늘어날 수 있어요.'
        : 'ISO가 중간 정도라 밝기와 화질을 적당히 균형 맞춘 상태예요.';

    if (aperture <= 3.5) {
      previewTitle.textContent = '부드러운 인물 느낌';
      previewDescription.textContent = '조리개가 열려 배경이 흐리고 피사체가 더 도드라져요.';
    } else if (shutterIndex <= 1) {
      previewTitle.textContent = '흐름이 느껴지는 장면';
      previewDescription.textContent = '셔터가 느려 움직임이 선처럼 이어져 보여요.';
    } else if (iso >= 1600) {
      previewTitle.textContent = '어두운 곳을 밝게';
      previewDescription.textContent = 'ISO가 올라가 밝아졌지만 화면 입자가 조금 더 보이기 쉬워요.';
    } else {
      previewTitle.textContent = '균형 잡힌 기본 설정';
      previewDescription.textContent = '세 요소가 무난하게 맞아 일상 사진에 쓰기 좋은 상태예요.';
    }
  }

  function setupStructureToggles() {
    document.querySelectorAll('[data-camera-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        state.camera = button.dataset.cameraToggle;
        const cameraData = data.parts[state.camera];
        if (!cameraData.items[state.part]) state.part = cameraData.defaultPart;
        body.dataset.camera = state.camera;
        document.querySelectorAll('[data-camera-toggle]').forEach((item) => {
          const isActive = item === button;
          item.classList.toggle('active', isActive);
          item.setAttribute('aria-selected', String(isActive));
        });
        if (state.camera === 'film' && state.part === 'sensor') state.part = 'film-chamber';
        if (state.camera === 'digital' && state.part === 'film-chamber') state.part = 'sensor';
        renderPart();
      });
    });

    hotspotButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (button.tabIndex === -1) return;
        state.part = button.dataset.part;
        renderPart();
      });
    });
  }

  function setupFlowToggles() {
    document.querySelectorAll('.flow-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        state.flow = button.dataset.flow;
        document.querySelectorAll('.flow-toggle').forEach((item) => {
          const isActive = item === button;
          item.classList.toggle('active', isActive);
          item.setAttribute('aria-selected', String(isActive));
        });
        renderFlow();
      });
    });
  }

  function setupRanges() {
    [apertureRange, shutterRange, isoRange].forEach((input) => input.addEventListener('input', updateExposurePreview));
    window.addEventListener('resize', renderModes);
  }

  function setupReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
  }

  function init() {
    body.dataset.camera = state.camera;
    body.dataset.flow = state.flow;
    renderPart();
    renderComparison();
    renderModes();
    renderModeCard();
    renderFlow();
    renderScenarioButtons();
    renderScenarioCard();
    updateExposurePreview();
    setupStructureToggles();
    setupFlowToggles();
    setupRanges();
    setupReveal();
  }

  init();
})();
