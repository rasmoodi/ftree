app.SVGRenderer = class extends app.Renderer {
    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        super();
        this._element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this._container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this._element.appendChild(this._container);
        this._scale = 1;
        this._offset = new g.Vec(0, 0);
        this._layout = null;
        this._isDirty = false;
        this.setSize(width, height);
    }

    /**
     * @override
     * @return {!Element}
     */
    element() {
        return this._element;
    }

    /**
     * @override
     * @param {number} width
     * @param {number} height
     */
    setSize(width, height) {
        if (g.eq(width, this._width) && g.eq(height, this._height))
            return;
        this._width = width;
        this._height = height;
        this._element.setAttribute('width', width + 'px');
        this._element.setAttribute('height', height + 'px');
        this._setTransformAttribute();
    }

    /**
     * @override
     * @return {{width: number, height: number}}
     */
    size() {
        return {width: this._width, height: this._height};
    }

    /**
     * @param {number} scale
     */
    setScale(scale) {
        this._scale = scale;
        this._setTransformAttribute();
    }

    /**
     * @override
     * @return {number}
     */
    scale() {
        return this._scale;
    }

    /**
     * @override
     * @param {!g.Vec} offset
     */
    setOffset(offset) {
        this._offset = offset;
        this._setTransformAttribute();
    }

    /**
     * @override
     * @return {!g.Vec}
     */
    offset() {
        return this._offset;
    }

    _setTransformAttribute() {
        var value = 'translate(' + (this._width/2) + ', ' + (this._height/2) + ') ';
        value += 'translate(' + this._offset.x + ', ' + this._offset.y + ') ';
        value += 'scale(' + this._scale + ', ' + this._scale + ') ';
        this._container.setAttribute('transform', value);
    }

    /**
     * @param {!app.Layout} layout
     */
    setLayout(layout) {
        if (this._layout === layout)
            return;
        this._layout = layout;
        this._isDirty = true;
    }

    /**
     * @override
     */
    render() {
        if (!this._isDirty)
            return;
        this._isDirty = false;
        if (this._container)
            this._container.remove();
        this._container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this._element.appendChild(this._container);
        this._setTransformAttribute();

        this._renderScaffolding(this._container, this._layout.scaffolding);

        for (var person of this._layout.positions.keys())
            this._renderPerson(this._container, this._layout, person);
    }

    /**
     * @param {!Element} container
     * @param {!app.Layout} layout
     */
    _renderScaffolding(container, scaffolding) {
        var path = '';
        for (var shape of scaffolding) {
            if (shape instanceof g.Line) {
                var line = /** @type {!g.Line} */(shape);
                path += ' M' + line.from.x + ' ' + line.from.y;
                path += ' L ' + line.to.x + ' ' + line.to.y;
            } else if (shape instanceof g.Arc) {
                var arc = /** @type {!g.Arc} */(shape);
                path += ' M' + arc.from.x + ' ' + arc.from.y;
                path += ' A ' + arc.r + ' ' + arc.r;
                var isLargeArc = g.normalizeRad(arc.toAngle - arc.fromAngle) > Math.PI;
                var component = isLargeArc ? ' 1 1' : ' 0 1';
                path += ' 0 ' + component;
                path += ' ' + arc.to.x + ' ' + arc.to.y;
            } else if (shape instanceof g.Bezier) {
                var bezier = /** @type {!g.Bezier} */(shape);
                path += ' M' + bezier.from.x + ' ' + bezier.from.y;
                path += ' Q ' + bezier.cp.x + ' ' + bezier.cp.y + ' ' + bezier.to.x + ' ' + bezier.to.y;
            }
        }

        var element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        element.setAttribute('d', path);
        element.setAttribute('fill', 'none');
        element.setAttribute('stroke', 'gray');
        container.appendChild(element);
    }

    _renderPersonCircle(position, radius, isRoot, gender, isChild, isDeceased) {
        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', position.x);
        circle.setAttribute('cy', position.y);
        circle.setAttribute('r', radius);
        return circle;
    }

    /**
     * @param {!Element} container
     * @param {!app.Layout} layout
     * @param {!app.Person} person
     */
    _renderPerson(container, layout, person) {
        var position = layout.positions.get(person);
        var personRadius = layout.personRadius;

        var rotation = g.normalizeRad(layout.rotations.get(person));
        var cumulativeRotation = g.normalizeRad(rotation);
        var textOnLeft = cumulativeRotation > Math.PI / 2 && cumulativeRotation < 3 * Math.PI / 2;
        if (textOnLeft)
            rotation -= Math.PI;
        rotation = g.radToDeg(rotation);

        var textPadding = 6;

        var group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        var transform = 'translate(' + position.x + ', ' + position.y + ') ';
        transform += 'rotate(' + rotation + ')';
        group.setAttribute('transform', transform);
        group.classList.add('person');
        if (person.deceased)
            group.classList.add('deceased');
        if (person.gender === app.Gender.Male)
            group.classList.add('sex-male');
        else if (person.gender === app.Gender.Female)
            group.classList.add('sex-female');
        else
            group.classList.add('sex-other');
        if (person.isChild())
            group.classList.add('infant');
        if (person === layout.root)
            group.classList.add('root');
        container.appendChild(group);

        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', personRadius);
        group.appendChild(circle);

        if (person === layout.root) {
            var fullName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            fullName.setAttribute('x', 0);
            fullName.setAttribute('y', personRadius);
            fullName.setAttribute('text-anchor', 'middle');
            fullName.setAttribute('dominant-baseline', 'text-after-edge');
            fullName.classList.add('name');
            fullName.textContent = person.fullName();
            group.appendChild(fullName);

            var dates = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dates.setAttribute('x', 0);
            dates.setAttribute('y', personRadius);
            dates.setAttribute('text-anchor', 'middle');
            dates.setAttribute('dominant-baseline', 'text-before-edge');
            dates.classList.add('dates');
            dates.textContent = person.dates();
            group.appendChild(dates);
        } else {
            var fullName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            fullName.setAttribute('dominant-baseline', 'text-after-edge');
            fullName.classList.add('name');
            fullName.textContent = person.fullName();
            group.appendChild(fullName);

            var dates = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dates.setAttribute('dominant-baseline', 'text-before-edge');
            dates.classList.add('dates');
            dates.textContent = person.dates();
            group.appendChild(dates);
            if (textOnLeft) {
                fullName.setAttribute('x', -personRadius - textPadding);
                fullName.setAttribute('y', 0);
                fullName.setAttribute('text-anchor', 'end');
                dates.setAttribute('x', -personRadius - textPadding);
                dates.setAttribute('y', 0);
                dates.setAttribute('text-anchor', 'end');
            } else {
                fullName.setAttribute('x', personRadius + textPadding);
                fullName.setAttribute('y', 0);
                dates.setAttribute('x', personRadius + textPadding);
                dates.setAttribute('y', 0);
            }
        }
    }

    createPersonIcon(size, gender, isChild, isDeceased) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size + 2);
        svg.setAttribute('height', size + 2);
        var radius = size / 2;
        svg.appendChild(this._renderPersonCircle(new g.Vec(radius+1, radius+1), radius, false, gender, isChild, isDeceased));
        return svg;
    }
}
