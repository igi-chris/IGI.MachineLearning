from typing import ClassVar, List, Optional, Tuple
from abc import ABC

from dataclasses import dataclass, field


@dataclass
class BaseModelArgument(ABC):
    field_type: ClassVar[str]
    display_name: str

    @property
    def id(self) -> str:
        """Get the id that can be used by default in the html"""
        return self.display_name.lower().replace(" ", "-")

    @property
    def dom_name(self) -> str:
        """The html element name is used for the arg name when submitting the form"""
        return self.display_name.lower().replace(" ", "_")

    def __str__(self):
        """Needed for dropdowns where selections are complex, can just call str() on any selection now"""
        return self.display_name


@dataclass
class StringSelectionArg(BaseModelArgument):
    field_type: ClassVar[str] = "selection"
    display_name: str
    default_value: Optional[str] = field(default=None)
    options: List[str] = field(default_factory=list)

    @property
    def id(self) -> str:
        """Get the id that can be used by default in the html"""
        return super().id + "-options"


@dataclass
class NumericalArg(BaseModelArgument):
    field_type: ClassVar[str] = "number"
    display_name: str
    default_value: float


@dataclass
class RangeArg(BaseModelArgument):
    field_type: ClassVar[str] = "range"
    display_name: str
    default_value: Tuple[float, float]


@dataclass
class NestedArgs(BaseModelArgument):
    field_type: ClassVar[str] = "group"
    display_name: str
    children: List[BaseModelArgument]


@dataclass
class TextInPlaceOfArgs(BaseModelArgument):
    field_type: ClassVar[str] = "display"
    display_name: str
    text: str


@dataclass
class ComplexSelectionArg(BaseModelArgument):
    field_type: ClassVar[str] = "selection-nested"
    display_name: str
    default_value: Optional[BaseModelArgument] = field(default=None)
    options: List[BaseModelArgument] = field(default_factory=list)

    @property
    def id(self) -> str:
        """Get the id that can be used by default in the html"""
        return super().id + "-options"


length_scale = NumericalArg(display_name="Length Scale", default_value=1.0)
length_scale_bounds = RangeArg(display_name="Length Scale Bounds", 
                               default_value=(1e-05, 100000.0))
nu = NumericalArg(display_name="nu (smoothness)", default_value=1.5)
default_display = TextInPlaceOfArgs(display_name="Default kernal used:",
    text="ConstantKernel(1.0, constant_value_bounds='fixed') * RBF(1.0, length_scale_bounds='fixed')")

kernel_default = NestedArgs(display_name="Default", 
    children=[default_display])
kernel_rbf = NestedArgs(display_name="RBF", 
    children=[length_scale, length_scale_bounds])
kernel_matern = NestedArgs(display_name="Matern", 
    children=[length_scale, length_scale_bounds, nu])

# todo? may need to be more specific i.e. I can image >1 model type having a kernel, but not the
#       same args. We may need to have an internal name (for id etc as well as display_name)
gaussian_process_kernel = ComplexSelectionArg("Kernel",
    default_value=None,
    options=[kernel_default, kernel_rbf, kernel_matern])
