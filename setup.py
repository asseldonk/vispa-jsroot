#!/usr/bin/env python
# -*- coding: utf-8 -*-

from distutils.core import setup


setup(
    name             = "jsroot",
    version          = "0.0.0",
    description      = "VISPA ROOT Browser - Inspect contents of root files.",
    author           = "VISPA Project",
    author_email     = "vispa@lists.rwth-aachen.de",
    url              = "http://vispa.physik.rwth-aachen.de/",
    license          = "GNU GPL v2",
    packages         = ["jsroot"],
    package_dir      = {"jsroot": "jsroot"},
    package_data     = {"jsroot": [
        "workspace/*",
        "static/*",
    ]},
    # install_requires = ["vispa"],
)
