#!/usr/bin/env python
# -*- coding: utf-8 -*-

from setuptools import setup

setup(
    name             = "vispa_jsroot",
    version          = "0.0.0",
    description      = "VISPA ROOT Browser - Inspect contents of root files.",
    author           = "VISPA Project",
    author_email     = "vispa@lists.rwth-aachen.de",
    url              = "http://vispa.physik.rwth-aachen.de/",
    license          = "MIT License",
    packages         = ["vispa_jsroot"],
    package_dir      = {"vispa_jsroot": "vispa_jsroot"},
    package_data     = {"vispa_jsroot": [
        "workspace/*",
        "static/*",
    ]},
    # install_requires = ["vispa"],
)
